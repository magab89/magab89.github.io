import { createHeadlessEditor } from "@lexical/headless";
import { $generateNodesFromDOM } from "@lexical/html";
import { $createParagraphNode, $createTextNode, $getRoot, $isElementNode, type LexicalEditor, type LexicalNode } from "lexical";
import {
  $createEmailNode,
  $createGroupNode,
  $createLockedBlockNode,
  $createSlotNode,
  CONTENT_MARKER,
  type SlotAttrs,
} from "./editor/emailNodes";
import { EMAIL_NODES, registerContentRules } from "./editor/emailRules";
import type { LexicalJson } from "./lexicalJson";
import { variablesIn } from "./templates";
import type { EmailSource, TagStyles } from "./types";

const FONT = "font-family:Arial, Helvetica, sans-serif;";
export const TEXT_STYLES: TagStyles = {
  h3: `margin:0 0 8px 0; font-size:16px; font-weight:bold; ${FONT} color:#212529; line-height:1.5;`,
  ul: `margin:0 0 16px 0; padding-left:20px; font-size:14px; ${FONT} color:#212529; line-height:1.5;`,
  ol: `margin:0 0 16px 0; padding-left:20px; font-size:14px; ${FONT} color:#212529; line-height:1.5;`,
  li: "margin:0 0 4px 0;",
  a: "color:#5227CC; font-weight:500; text-decoration:underline;",
};

type Block = { lines: string[]; guard: string | null };
type SlotPlan = SlotAttrs & { value: string };
type Plan =
  | { kind: "locked"; id: string; label: string; html: string; condition: string | null }
  | ({ kind: "slot" } & SlotPlan)
  | { kind: "group"; id: string; wrapper: string; slots: SlotPlan[] };

const indentOf = (line: string) => line.match(/^ */)![0].length;
const guardVar = (line: string) => line.match(/\{%-?\s*if\s+([a-z_][a-z0-9_]*)/)?.[1] ?? null;
const isTagLine = (line: string) => /^\{%[\s\S]*%\}$/.test(line.trim());
const protectTags = (lines: string[]) => lines.map((l) => (isTagLine(l) ? l.replace(/(\{%[\s\S]*%\})/, "<!--$1-->") : l)).join("\n");

function conditionLabel(variable: string | null, slug: string): string | null {
  if (!variable) return null;
  const advisorEmail = slug.startsWith("ad_");
  const labels: Record<string, string> = {
    decline_message: "Only if the advisor adds a note",
    cancellation_reason: advisorEmail ? "Only if the client gives a reason" : "Only if the advisor adds a note",
    client_message: "Only if the client adds a note",
    reschedule_message: "Only if the client adds a rescheduling note",
    request_type: "Only for reschedule requests with a note",
    event_type_booking_link: "Only if the client can book again",
    intake_answers: "Only if the client answered intake questions",
    notification_settings_link: "Only if notification settings apply",
  };
  return labels[variable] ?? `Only if ${variable.replace(/_/g, " ")} is set`;
}

function splitFrame(body: string) {
  const lines = body.split("\n");
  const open = lines.findIndex((l) => l.includes('<td bgcolor="#ffffff">'));
  const close = lines.findIndex((l, i) => i > open && l === " ".repeat(indentOf(lines[open])) + "</td>");
  if (open < 0 || close < 0) throw new Error("Content cell not found");
  return { frame: lines.slice(0, open + 1).join("\n") + CONTENT_MARKER + lines.slice(close).join("\n"), content: lines.slice(open + 1, close) };
}

function splitBlocks(content: string[]): Block[] {
  if (content.length === 0) return [];
  const indent = indentOf(content[0]);
  const raw: string[][] = [];
  for (const line of content) {
    const t = line.trim();
    const opens = indentOf(line) === indent && (/^<[a-zA-Z]/.test(t) || t.startsWith("{% if"));
    if (opens || raw.length === 0) raw.push([line]);
    else raw[raw.length - 1].push(line);
  }
  const blocks: Block[] = [];
  for (let i = 0; i < raw.length; i++) {
    const first = raw[i][0].trim();
    if (!(first.startsWith("{% if") && raw[i].length === 1)) {
      blocks.push({ lines: raw[i], guard: null });
      continue;
    }
    const group = [...raw[i]];
    let depth = 1;
    while (depth > 0 && ++i < raw.length) {
      for (const line of raw[i]) {
        if (indentOf(line) === indent && line.trim().startsWith("{% if")) depth++;
        if (indentOf(line) === indent && line.trim() === "{% endif %}") depth--;
      }
      group.push(...raw[i]);
    }
    blocks.push({ lines: group, guard: guardVar(first) });
  }
  return blocks;
}

type Para = { open: string; style: string; text: string };

function plainParagraph(lines: string[]): Para | null {
  if (lines.length !== 3) return null;
  const open = lines[0].trim().match(/^<p style="([^"]*)">$/);
  if (!open || lines[2].trim() !== "</p>") return null;
  const text = lines[1].trim();
  if (/[<>]/.test(text) || text.includes("{%")) return null;
  return { open: lines[0].trim(), style: open[1], text };
}

function buttonBlock(lines: string[]): { wrapper: string; label: string } | null {
  if (!lines[0].trim().startsWith("<table")) return null;
  const a = lines.findIndex((l) => /^<a href="[^"]*"[^>]*>$/.test(l.trim()));
  if (a < 0 || lines[a + 2]?.trim() !== "</a>") return null;
  const label = lines[a + 1].trim();
  if (/[<>{}]/.test(label)) return null;
  const wrapper = [...lines.slice(0, a), lines[a] + CONTENT_MARKER + "</a>", ...lines.slice(a + 3)].join("\n");
  return { wrapper, label };
}

const isBold = (style: string) => /font-weight:\s*(bold|700)/.test(style);

export function templateToEditorState(source: EmailSource): LexicalJson {
  const { frame: rawFrame, content } = splitFrame(source.body);
  const frame = rawFrame.includes(`<title>${source.subject}</title>`) ? rawFrame.replace(`<title>${source.subject}</title>`, () => "<title>[[subject]]</title>") : rawFrame;
  const blocks = splitBlocks(content);
  const footerStart = blocks.findIndex((b) => b.lines.some((l) => l.trim().startsWith("<hr")));
  const ids = new Set<string>();
  const uniqueId = (label: string) => {
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    let id = base;
    for (let n = 2; ids.has(id); n++) id = `${base}_${n}`;
    ids.add(id);
    return id;
  };
  let textCount = 0;
  const plans: Plan[] = [];

  const slot = (label: string, partial: Partial<SlotAttrs> & Pick<SlotAttrs, "slotFormat">, value: string): SlotPlan => ({
    slotId: uniqueId(label),
    label,
    required: true,
    maxLength: partial.slotFormat === "rich" ? 5000 : 200,
    wrapper: "",
    prefix: "",
    suffix: "",
    blockStyle: "",
    condition: null,
    dropIfEmpty: false,
    look: "text",
    ...partial,
    value,
  });

  const textLabel = (bold: boolean, next?: Block, prev?: Block) => {
    const n = textCount++;
    if (n === 0) return "Greeting";
    if (n === 1) return "Message";
    if (bold) return "Heading";
    if (next && buttonBlock(next.lines)) return "Before the button";
    if (prev && buttonBlock(prev.lines)) return "After the button";
    if (prev?.lines.join("\n").includes("text-transform:uppercase")) return "After the details";
    return "Text";
  };

  const lockedLabel = (lines: string[]) => {
    const html = lines.join("\n");
    if (html.includes("text-transform:uppercase")) return "Meeting details";
    if (html.includes("<strong")) return "Note";
    return "Locked block";
  };

  const planBlock = (block: Block, prev: Block | undefined, next: Block | undefined, condition: string | null): Plan[] => {
    const para = plainParagraph(block.lines);
    if (para) {
      const bold = isBold(para.style);
      const label = textLabel(bold, next, prev);
      const required = label === "Greeting" || label === "Message";
      return [
        {
          kind: "slot",
          ...(bold
            ? slot(label, { slotFormat: "plain", wrapper: `${para.open}${CONTENT_MARKER}</p>`, required, dropIfEmpty: !required, condition }, para.text)
            : slot(label, { slotFormat: "rich", blockStyle: para.style, required, dropIfEmpty: !required, condition }, `<p>${para.text}</p>`)),
        },
      ];
    }
    const inline = block.lines.length === 3 ? block.lines[1].trim().match(/^(.*?)(\{% if [^%]+ %\})( )(.*)(\{% endif %\})$/) : null;
    const open = block.lines[0].trim();
    if (inline && /^<p style="[^"]*">$/.test(open) && !/[<>]/.test(inline[1] + inline[4])) {
      const label = textLabel(false, next, prev);
      return [
        {
          kind: "group",
          id: uniqueId(`${label} group`),
          wrapper: `${open}${CONTENT_MARKER}</p>`,
          slots: [
            slot(label, { slotFormat: "plain", maxLength: 500 }, inline[1]),
            slot(
              `${label}, conditional sentence`,
              { slotFormat: "plain", maxLength: 300, required: false, prefix: inline[2] + inline[3], suffix: inline[5], condition: conditionLabel(guardVar(inline[2]), source.slug) },
              inline[4],
            ),
          ],
        },
      ];
    }
    const button = buttonBlock(block.lines);
    if (button) {
      return [{ kind: "slot", ...slot("Button text", { slotFormat: "plain", maxLength: 60, wrapper: button.wrapper, look: "button", condition }, button.label) }];
    }
    const label = lockedLabel(block.lines);
    return [{ kind: "locked", id: uniqueId(label), label, html: protectTags(block.lines), condition }];
  };

  blocks.forEach((block, i) => {
    if (footerStart >= 0 && i > footerStart) return;
    if (footerStart >= 0 && i === footerStart) {
      plans.push({ kind: "locked", id: uniqueId("Footer"), label: "Footer", html: protectTags(blocks.slice(footerStart).flatMap((b) => b.lines)), condition: null });
      return;
    }
    if (!block.guard) {
      plans.push(...planBlock(block, blocks[i - 1], blocks[i + 1], null));
      return;
    }
    const inner = splitBlocks(block.lines.slice(1, -1));
    const editable = inner.some((b) => plainParagraph(b.lines) || buttonBlock(b.lines));
    const condition = conditionLabel(block.guard, source.slug);
    if (!editable) {
      plans.push({ kind: "locked", id: uniqueId(lockedLabel(block.lines)), label: lockedLabel(block.lines), html: protectTags(block.lines), condition });
      return;
    }
    plans.push({ kind: "locked", id: uniqueId("Condition start"), label: "Condition start", html: protectTags([block.lines[0]]), condition: null });
    inner.forEach((b, j) => plans.push(...planBlock(b, inner[j - 1] ?? blocks[i - 1], inner[j + 1] ?? blocks[i + 1], condition)));
    plans.push({ kind: "locked", id: uniqueId("Condition end"), label: "Condition end", html: protectTags([block.lines[block.lines.length - 1]]), condition: null });
  });

  const editor = createHeadlessEditor({
    namespace: "convert",
    nodes: EMAIL_NODES,
    onError: (e) => {
      throw e;
    },
  });
  registerContentRules(editor);
  editor.update(
    () => {
      const email = $createEmailNode(frame, variablesIn(source.body, source.subject), TEXT_STYLES);
      $getRoot().clear().append(email);
      email.append($fillSlot(editor, slot("Subject", { slotFormat: "plain", maxLength: 200 }, source.subject)));
      for (const plan of plans) {
        if (plan.kind === "locked") email.append($createLockedBlockNode(plan.id, plan.label, plan.html, plan.condition));
        else if (plan.kind === "slot") email.append($fillSlot(editor, plan));
        else email.append($createGroupNode(plan.id, plan.wrapper).append(...plan.slots.map((s) => $fillSlot(editor, s))));
      }
    },
    { discrete: true },
  );
  return editor.getEditorState().toJSON() as unknown as LexicalJson;
}

function $fillSlot(editor: LexicalEditor, plan: SlotPlan) {
  const { value, ...attrs } = plan;
  const slot = $createSlotNode(attrs);
  if (attrs.slotFormat === "plain") {
    const paragraph = $createParagraphNode();
    if (value) paragraph.append($createTextNode(value));
    slot.append(paragraph);
    return slot;
  }
  const dom = new DOMParser().parseFromString(value || "<p></p>", "text/html");
  let loose: LexicalNode[] = [];
  const flush = () => {
    if (loose.length) slot.append($createParagraphNode().append(...loose));
    loose = [];
  };
  for (const node of $generateNodesFromDOM(editor, dom)) {
    if ($isElementNode(node) && !node.isInline()) {
      flush();
      slot.append(node);
    } else {
      loose.push(node);
    }
  }
  flush();
  if (slot.getChildrenSize() === 0) slot.append($createParagraphNode());
  return slot;
}
