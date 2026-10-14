import { validateLexicalJson, type LexicalJson, type LexNode } from "./lexicalJson";
import type { SlotFormat, TagStyles, Variable } from "./types";

export type SlotJson = LexNode & {
  type: "email-slot";
  slotId: string;
  label: string;
  slotFormat: SlotFormat;
  required: boolean;
  maxLength: number | null;
  wrapper: string;
  prefix: string;
  suffix: string;
  blockStyle: string;
  condition: string | null;
  dropIfEmpty: boolean;
  look: "text" | "button";
};
export type EmailJson = LexNode & { type: "email"; frame: string; variables: Variable[]; textStyles: TagStyles };

const SLOT_ATTRS = [
  "slotId",
  "label",
  "slotFormat",
  "required",
  "maxLength",
  "wrapper",
  "prefix",
  "suffix",
  "blockStyle",
  "condition",
  "dropIfEmpty",
  "look",
] as const;

export function emailOf(state: LexicalJson): EmailJson | null {
  const first = state?.root?.children?.[0];
  return first?.type === "email" ? (first as EmailJson) : null;
}

export function slotsOf(state: LexicalJson): SlotJson[] {
  return (emailOf(state)?.children ?? []).flatMap((c) =>
    c.type === "email-slot" ? [c as SlotJson] : c.type === "email-group" ? ((c.children ?? []).filter((s) => s.type === "email-slot") as SlotJson[]) : [],
  );
}

function describe(node: LexNode): unknown {
  if (node.type === "email-slot") return { slot: Object.fromEntries(SLOT_ATTRS.map((k) => [k, (node as SlotJson)[k]])) };
  if (node.type === "email-locked") return { locked: node.blockId, html: node.html, condition: node.condition ?? null };
  if (node.type === "email-group") return { group: node.groupId, wrapper: node.wrapper, slots: (node.children ?? []).map(describe) };
  return { other: node.type };
}

export function structureOf(state: LexicalJson): string {
  const email = emailOf(state);
  if (state?.root?.children?.length !== 1 || !email) return "invalid";
  return JSON.stringify({ frame: email.frame, variables: email.variables, textStyles: email.textStyles, blocks: (email.children ?? []).map(describe) });
}

function textOf(slot: SlotJson): string {
  const leaves = (n: LexNode): LexNode[] => (n.children ? n.children.flatMap(leaves) : [n]);
  return (slot.children ?? [])
    .flatMap(leaves)
    .map((n) => (n.type === "text" ? String(n.text ?? "") : n.type === "variable" ? `{{ ${String(n.variable)} }}` : ""))
    .join("");
}

export const slotText = textOf;

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
