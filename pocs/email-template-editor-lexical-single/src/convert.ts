import { createHeadlessEditor } from "@lexical/headless";
import { $generateNodesFromDOM } from "@lexical/html";
import { $createParagraphNode, $createTextNode, $getRoot, $isElementNode, type LexicalEditor, type LexicalNode } from "lexical";
import { $createEmailNode, $createLockedBlockNode, $createSlotNode, type SlotAttrs } from "./editor/emailNodes";
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

export type SlotPlan = Omit<SlotAttrs, "slotId" | "label"> & { id: string; label: string; value: string };
export type BlockPlan = { kind: "locked"; id: string; label: string; html: string; condition: string | null } | ({ kind: "slot" } & SlotPlan);

export type EmailPlan = { frame: string; subject: SlotPlan; blocks: BlockPlan[] };

const indentOf = (line: string) => line.match(/^ */)![0].length;
const guardVar = (line: string) => line.match(/\{%-?\s*if\s+([a-z_][a-z0-9_]*)/)?.[1] ?? null;

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
    firm_business_address: "Only if the firm has an address",
    unsubscribe_link: "Only when an unsubscribe link applies",
  };
  return labels[variable] ?? `Only if ${variable.replace(/_/g, " ")} is set`;
}

function splitFrame(body: string) {
  const lines = body.split("\n");
  const open = lines.findIndex((l) => l.includes('<td bgcolor="#ffffff">'));
  const close = lines.findIndex((l, i) => i > open && l === " ".repeat(indentOf(lines[open])) + "</td>");
  if (open < 0 || close < 0) throw new Error("Content cell not found");
  return {
    frame: [...lines.slice(0, open + 1)].join("\n") + "[[content]]\n" + lines.slice(close).join("\n"),
    content: lines.slice(open + 1, close),
  };
}

function splitBlocks(content: string[]): Block[] {
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

type Para = { open: string; style: string; text: string; indent: string };

function plainParagraph(lines: string[]): Para | null {
  if (lines.length !== 3) return null;
  const open = lines[0].trim().match(/^<p style="([^"]*)">$/);
  if (!open || lines[2].trim() !== "</p>") return null;
  const text = lines[1].trim();
  if (/[<>]/.test(text)) return null;
  return { open: lines[0].trim(), style: open[1], text, indent: " ".repeat(indentOf(lines[0])) };
}

const isBold = (style: string) => /font-weight:\s*(bold|700)/.test(style);

function labelFor(index: number, blocks: Block[], i: number, bold: boolean): string {
  if (index === 0) return "Greeting";
  if (index === 1) return "Message";
  if (bold) return "Heading";
  const isButton = (b?: Block) => !!b && b.lines.join("\n").includes("<a href=") && b.lines[0].trim().startsWith("<table");
  const inGroupWithButton = !!blocks[i]?.guard && blocks[i].lines.join("\n").includes("<a href=");
  if (isButton(blocks[i + 1]) || inGroupWithButton) return "Before the button";
  if (isButton(blocks[i - 1])) return "After the button";
  if (blocks[i - 1]?.lines.join("\n").includes("text-transform:uppercase")) return "After the details";
  return "Text";
}

function lockedLabel(block: Block): string {
  const html = block.lines.join("\n");
  if (html.includes("text-transform:uppercase")) return "Meeting details";
  if (html.includes("<a href=") && block.lines.some((l) => l.trim().startsWith("<table"))) return "Button";
  if (html.includes("<strong")) return "Note";
  return "Locked block";
}

export function planEmail(source: EmailSource): EmailPlan {
  const { frame: rawFrame, content } = splitFrame(source.body);
  const frame = rawFrame.includes(`<title>${source.subject}</title>`)
    ? rawFrame.replace(`<title>${source.subject}</title>`, () => "<title>[[subject]]</title>")
    : rawFrame;
  const blocks = splitBlocks(content);
  const footerStart = blocks.findIndex((b) => b.lines.some((l) => l.trim().startsWith("<hr")));
  const plans: BlockPlan[] = [];
  const ids = new Set<string>();
  const uniqueId = (label: string) => {
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    let id = base;
    for (let n = 2; ids.has(id); n++) id = `${base}_${n}`;
    ids.add(id);
    return id;
  };
  let editableCount = 0;

  const slotFromParagraph = (para: Para, i: number, before: string, condition: string | null): BlockPlan => {
    const bold = isBold(para.style);
    const label = labelFor(editableCount++, blocks, i, bold);
    const required = label === "Greeting" || label === "Message";
    const inner = para.indent + "  ";
    return bold
      ? {
          kind: "slot",
          id: uniqueId(label),
          label,
          slotFormat: "plain",
          required,
          maxLength: 200,
          before: `${before}\n${para.indent}${para.open}\n${inner}`,
          after: `\n${para.indent}</p>`,
          condition,
          dropIfEmpty: !required,
          lineIndent: para.indent,
          blockStyle: "",
          value: para.text,
        }
      : {
          kind: "slot",
          id: uniqueId(label),
          label,
          slotFormat: "rich",
          required,
          maxLength: 5000,
          before: `${before}\n${para.indent}`,
          after: "",
          condition,
          dropIfEmpty: !required,
          lineIndent: para.indent,
          blockStyle: para.style,
          value: `<p>${para.text}</p>`,
        };
  };

  blocks.forEach((block, i) => {
    if (footerStart >= 0 && i > footerStart) return;
    if (footerStart >= 0 && i === footerStart) {
      const html = "\n" + blocks.slice(footerStart).flatMap((b) => b.lines).join("\n");
      plans.push({ kind: "locked", id: uniqueId("Footer"), label: "Footer", html, condition: null });
      return;
    }
    const html = "\n" + block.lines.join("\n");
    const condition = conditionLabel(block.guard, source.slug);

    if (!block.guard) {
      const para = plainParagraph(block.lines);
      if (para && !para.text.includes("{%")) {
        plans.push(slotFromParagraph(para, i, "", null));
        return;
      }
      const inline = block.lines.length === 3 ? block.lines[1].trim().match(/^(.*?)(\{% if [^%]+ %\})( )(.*)(\{% endif %\})$/) : null;
      const open = block.lines[0].trim();
      if (inline && /^<p style="[^"]*">$/.test(open) && !/[<>]/.test(inline[1] + inline[4])) {
        const ind = " ".repeat(indentOf(block.lines[0]));
        const label = labelFor(editableCount++, blocks, i, false);
        const common = { slotFormat: "plain" as const, maxLength: 500, dropIfEmpty: false, lineIndent: ind, blockStyle: "" };
        plans.push({
          kind: "slot",
          id: uniqueId(label),
          label,
          required: true,
          before: `\n${ind}${open}\n${ind}  `,
          after: "",
          condition: null,
          value: inline[1],
          ...common,
        });
        plans.push({
          kind: "slot",
          id: uniqueId(`${label} hint`),
          label: `${label}, conditional sentence`,
          required: false,
          before: inline[2] + inline[3],
          after: `${inline[5]}\n${ind}</p>`,
          condition: conditionLabel(guardVar(inline[2]), source.slug),
          value: inline[4],
          ...common,
        });
        return;
      }
      plans.push({ kind: "locked", id: uniqueId(lockedLabel(block)), label: lockedLabel(block), html, condition: null });
      return;
    }

    const innerLines = block.lines.slice(1);
    const firstEnd = innerLines.findIndex((l) => l.trim() === "</p>");
    const para = firstEnd === 2 ? plainParagraph(innerLines.slice(0, 3)) : null;
    if (para && !para.text.includes("{%")) {
      plans.push({ kind: "locked", id: uniqueId("Condition start"), label: "Condition start", html: "\n" + block.lines[0], condition: null });
      plans.push(slotFromParagraph(para, i, "", condition));
      const rest = "\n" + innerLines.slice(3).join("\n");
      plans.push({ kind: "locked", id: uniqueId(lockedLabel({ lines: innerLines.slice(3), guard: null })), label: "Button", html: rest, condition });
      return;
    }
    plans.push({ kind: "locked", id: uniqueId(lockedLabel(block)), label: lockedLabel(block), html, condition });
  });

  const subject: SlotPlan = {
    id: "subject",
    label: "Subject",
    slotFormat: "plain",
    required: true,
    maxLength: 200,
    before: "",
    after: "",
    condition: null,
    dropIfEmpty: false,
    lineIndent: "",
    blockStyle: "",
    value: source.subject,
  };
  return { frame, subject, blocks: plans };
}

function $fillSlot(editor: LexicalEditor, plan: SlotPlan) {
  const { id, label, value, ...rest } = plan;
  const slot = $createSlotNode({ ...rest, slotId: id, label });
  if (plan.slotFormat === "plain") {
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

export function templateToEditorState(source: EmailSource): LexicalJson {
  const plan = planEmail(source);
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
      const email = $createEmailNode(plan.frame, variablesIn(source.body, source.subject), TEXT_STYLES);
      $getRoot().clear().append(email);
      email.append($fillSlot(editor, plan.subject));
      for (const block of plan.blocks) {
        if (block.kind === "locked") email.append($createLockedBlockNode(block.id, block.label, block.html, block.condition));
        else email.append($fillSlot(editor, block));
      }
    },
    { discrete: true },
  );
  return editor.getEditorState().toJSON() as unknown as LexicalJson;
}
