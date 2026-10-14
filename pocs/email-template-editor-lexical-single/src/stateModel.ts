import { compileText, EDITOR_COMMENT, type StyleContext } from "./compile";
import { lexicalJsonToHtml, validateLexicalJson, type LexicalJson, type LexNode } from "./lexicalJson";
import { prettyHtml } from "./prettyHtml";
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
};
export type LockedJson = LexNode & { type: "email-locked"; blockId: string; label: string; html: string };
export type EmailJson = LexNode & { type: "email"; frame: string; variables: Variable[]; textStyles: TagStyles };

export const SLOT_ATTRS = ["slotId", "label", "slotFormat", "required", "maxLength", "before", "after", "condition", "dropIfEmpty"] as const;

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
          ? { locked: (c as LockedJson).blockId, html: (c as LockedJson).html }
          : { other: c.type },
    ),
  });
}

export const slotHtml = (slot: SlotJson) => lexicalJsonToHtml({ root: { type: "root", children: slot.children ?? [] } }, slot.slotFormat);

const plainTextOf = (slot: SlotJson) => {
  const html = slotHtml(slot);
  if (slot.slotFormat === "plain") return html;
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  return tpl.content.textContent ?? "";
};

export function compileState(state: LexicalJson): { subject: string; body: string } {
  const email = emailOf(state);
  if (!email) throw new Error("Not an email document");
  const ctx: StyleContext = { variables: email.variables, textStyles: email.textStyles };
  const subjectSlot = slotsOf(state).find((s) => s.slotId === "subject");
  const subject = subjectSlot ? compileText({ format: "plain", value: slotHtml(subjectSlot) }, ctx) : "";
  const parts = (email.children ?? [])
    .filter((c) => !(c.type === "email-slot" && (c as SlotJson).slotId === "subject"))
    .map((c) => {
      if (c.type === "email-locked") return (c as LockedJson).html;
      if (c.type !== "email-slot") return "";
      const slot = c as SlotJson;
      const value = slotHtml(slot);
      if (slot.dropIfEmpty && !slot.required && plainTextOf(slot).trim() === "") return "";
      return slot.before + compileText({ format: slot.slotFormat, value }, ctx) + slot.after;
    });
  return { subject, body: prettyHtml(email.frame.replace(/\[\[\s*content\s*\]\]/, parts.join("")).replace(EDITOR_COMMENT, "")) };
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
    const text = plainTextOf(slot);
    if (slot.required && text.trim() === "") push("Can't be empty.");
    if (slot.maxLength && text.length > slot.maxLength) push(`Longer than ${slot.maxLength} characters.`);
    if (/\{%|\{#|\{\{|\}\}/.test(text.replace(/\{\{\s*[a-z][a-z0-9_]*\s*\}\}/g, ""))) push("Template logic ({% %}, {# #} or a stray {{ }}) isn't allowed.");
  }
  return errors;
}
