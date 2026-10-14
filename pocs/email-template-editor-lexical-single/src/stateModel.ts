import { EDITOR_COMMENT } from "./compile";
import { lexicalJsonToHtml, validateLexicalJson, type LexicalJson, type LexNode } from "./lexicalJson";
import type { SlotFormat, TagStyles, Variable } from "./types";

export type SlotJson = LexNode & {
  type: "email-slot";
  slotId: string;
  label: string;
  slotFormat: SlotFormat;
  required: boolean;
  maxLength: number | null;
  before: string;
  after: string;
  condition: string | null;
  dropIfEmpty: boolean;
  lineIndent: string;
  blockStyle: string;
};
export type LockedJson = LexNode & { type: "email-locked"; blockId: string; label: string; html: string; condition: string | null };
export type EmailJson = LexNode & { type: "email"; frame: string; variables: Variable[]; textStyles: TagStyles };

export const SLOT_ATTRS = [
  "slotId",
  "label",
  "slotFormat",
  "required",
  "maxLength",
  "before",
  "after",
  "condition",
  "dropIfEmpty",
  "lineIndent",
  "blockStyle",
] as const;

export function emailOf(state: LexicalJson): EmailJson | null {
  const first = state?.root?.children?.[0];
  return first?.type === "email" ? (first as EmailJson) : null;
}

export function slotsOf(state: LexicalJson): SlotJson[] {
  return (emailOf(state)?.children ?? []).filter((c): c is SlotJson => c.type === "email-slot");
}

export function structureOf(state: LexicalJson): string {
  const root = state?.root;
  const email = emailOf(state);
  if (!root || root.children?.length !== 1 || !email) return "invalid";
  return JSON.stringify({
    frame: email.frame,
    variables: email.variables,
    textStyles: email.textStyles,
    blocks: (email.children ?? []).map((c) =>
      c.type === "email-slot"
        ? { slot: Object.fromEntries(SLOT_ATTRS.map((k) => [k, (c as SlotJson)[k]])) }
        : c.type === "email-locked"
          ? { locked: (c as LockedJson).blockId, html: (c as LockedJson).html, condition: (c as LockedJson).condition ?? null }
          : { other: c.type },
    ),
  });
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const BOLD = 1;
const ITALIC = 2;
const STRIKETHROUGH = 4;
const UNDERLINE = 8;

function wrap(format: number, inner: string): string {
  let out = inner;
  if (format & STRIKETHROUGH) out = `<s>${out}</s>`;
  if (format & UNDERLINE) out = `<u>${out}</u>`;
  if (format & ITALIC) out = `<em>${out}</em>`;
  if (format & BOLD) out = `<strong>${out}</strong>`;
  return out;
}

function inline(nodes: LexNode[] = [], styles: TagStyles): string {
  return nodes
    .map((n) => {
      if (n.type === "text") return wrap(Number(n.format) || 0, esc(String(n.text ?? "")));
      if (n.type === "variable") return wrap(Number(n.format) || 0, `{{ ${String(n.variable)} }}`);
      if (n.type === "linebreak") return "<br />";
      if (n.type === "link") {
        const style = styles.a ? ` style="${styles.a}"` : "";
        return `<a href="${esc(String(n.url ?? ""))}" target="_blank" rel="noopener noreferrer"${style}>${inline(n.children, styles)}</a>`;
      }
      return "";
    })
    .join("");
}

function listHtml(list: LexNode, ind: string, styles: TagStyles): string {
  const tag = list.listType === "number" ? "ol" : "ul";
  const li = styles.li ? ` style="${styles.li}"` : "";
  const items: string[] = [];
  for (const item of list.children ?? []) {
    const nested = (item.children ?? []).filter((c) => c.type === "list");
    const own = inline((item.children ?? []).filter((c) => c.type !== "list"), styles);
    const nestedHtml = nested.map((l) => listHtml(l, ind + "    ", styles)).join("");
    if (!own && nestedHtml && items.length) items[items.length - 1] = items[items.length - 1].replace(/<\/li>$/, `${nestedHtml}</li>`);
    else items.push(`\n${ind}  <li${li}>${own}${nestedHtml}</li>`);
  }
  const style = styles[tag] ? ` style="${styles[tag]}"` : "";
  return `<${tag}${style}>${items.join("")}\n${ind}</${tag}>`;
}

function richHtml(slot: SlotJson, styles: TagStyles): string {
  const ind = slot.lineIndent;
  const blocks = [...(slot.children ?? [])];
  const isEmptyParagraph = (b: LexNode) => b.type === "paragraph" && inline(b.children, styles).trim() === "";
  while (blocks.length > 1 && isEmptyParagraph(blocks[blocks.length - 1])) blocks.pop();
  return blocks
    .map((block) => {
      if (block.type === "list") return listHtml(block, ind, styles);
      const content = inline(block.children, styles) || "<br />";
      if (block.type === "heading") return `<h3 style="${styles.h3 ?? ""}">\n${ind}  ${content}\n${ind}</h3>`;
      return `<p style="${slot.blockStyle}">\n${ind}  ${content}\n${ind}</p>`;
    })
    .join(`\n${ind}`);
}

const plainText = (slot: SlotJson) =>
  (slot.children ?? [])
    .flatMap((p) => p.children ?? [])
    .map((n) => (n.type === "variable" ? `{{ ${String(n.variable)} }}` : n.type === "text" ? String(n.text ?? "") : ""))
    .join("");

const plainHtml = (slot: SlotJson) => esc(plainText(slot)).replace(/\{\{ ([a-z_][a-z0-9_]*) \}\}/g, "{{ $1 }}");

export const slotHtml = (slot: SlotJson) =>
  lexicalJsonToHtml({ root: { type: "root", children: slot.children ?? [] } }, slot.slotFormat);

function textOf(slot: SlotJson): string {
  return (slot.children ?? [])
    .flatMap(function leaves(n: LexNode): LexNode[] {
      return n.children ? n.children.flatMap(leaves) : [n];
    })
    .map((n) => (n.type === "text" ? String(n.text ?? "") : n.type === "variable" ? `{{ ${String(n.variable)} }}` : ""))
    .join("");
}

export function compileState(state: LexicalJson): { subject: string; body: string } {
  const email = emailOf(state);
  if (!email) throw new Error("Not an email document");
  const styles = email.textStyles ?? {};
  const subjectSlot = slotsOf(state).find((s) => s.slotId === "subject");
  const subject = subjectSlot ? plainText(subjectSlot) : "";
  const title = subjectSlot ? plainHtml(subjectSlot) : "";
  const parts = (email.children ?? [])
    .filter((c) => !(c.type === "email-slot" && (c as SlotJson).slotId === "subject"))
    .map((c) => {
      if (c.type === "email-locked") return (c as LockedJson).html;
      if (c.type !== "email-slot") return "";
      const slot = c as SlotJson;
      if (slot.dropIfEmpty && !slot.required && textOf(slot).trim() === "") return "";
      const content = slot.slotFormat === "plain" ? plainHtml(slot) : richHtml(slot, styles);
      return slot.before + content + slot.after;
    });
  const body = email.frame
    .replace("[[content]]", () => parts.join(""))
    .replace("[[subject]]", () => title)
    .replace(EDITOR_COMMENT, "");
  return { subject, body };
}

export type StateError = { slotId: string; label: string; message: string };

export function validateState(state: LexicalJson): StateError[] {
  const email = emailOf(state);
  if (!email) return [{ slotId: "", label: "Document", message: "Not an email document." }];
  const insertable = new Set(email.variables.filter((v) => v.insertable).map((v) => v.name));
  const errors: StateError[] = [];
  for (const slot of slotsOf(state)) {
    const push = (message: string) => {
      if (!errors.some((e) => e.slotId === slot.slotId && e.message === message)) errors.push({ slotId: slot.slotId, label: slot.label, message });
    };
    validateLexicalJson({ root: { type: "root", children: slot.children ?? [] } }, slot.slotFormat, insertable).forEach(push);
    const text = textOf(slot);
    if (slot.required && text.trim() === "") push("Can't be empty.");
    if (slot.maxLength && text.length > slot.maxLength) push(`Longer than ${slot.maxLength} characters.`);
    if (/\{%|\{#|\{\{|\}\}/.test(text.replace(/\{\{\s*[a-z][a-z0-9_]*\s*\}\}/g, ""))) push("Template logic ({% %}, {# #} or a stray {{ }}) isn't allowed.");
  }
  return errors;
}
