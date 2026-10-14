import { validateLexicalJson, type LexicalJson, type LexNode } from "./lexicalJson";
import { blockConditions, contentSignature, slotLabel, slotMaxLength, slotRequired, type BlockInfo } from "./slotRules";
import type { SlotFormat, Variable } from "./types";

export type SlotJson = LexNode & { type: "email-slot"; slotId: string; slotFormat: SlotFormat; editable: boolean; wrapper: string };
export type EmailJson = LexNode & { type: "email"; frame: string; variables: Variable[] };

const SLOT_ATTRS = ["slotId", "slotFormat", "editable", "wrapper"] as const;

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
  if (node.type === "email-slot") {
    const slot = node as SlotJson;
    return { slot: Object.fromEntries(SLOT_ATTRS.map((k) => [k, slot[k]])), content: slot.editable ? null : contentSignature(slot.children ?? []) };
  }
  if (node.type === "email-locked") return { locked: node.blockId, html: node.html };
  if (node.type === "email-group") return { group: node.groupId, wrapper: node.wrapper, slots: (node.children ?? []).map(describe) };
  return { other: node.type };
}

export function structureOf(state: LexicalJson): string {
  const email = emailOf(state);
  if (state?.root?.children?.length !== 1 || !email) return "invalid";
  return JSON.stringify({ frame: email.frame, variables: email.variables, blocks: (email.children ?? []).map(describe) });
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
      if (!errors.some((e) => e.slotId === slot.slotId && e.message === message)) errors.push({ slotId: slot.slotId, label: slotLabel(slot.slotId), message });
    };
    validateLexicalJson({ root: { type: "root", children: slot.children ?? [] } }, slot.slotFormat, insertable).forEach(push);
    const text = textOf(slot);
    const maxLength = slotMaxLength(slot);
    if (slotRequired(slot) && text.trim() === "") push("Can't be empty.");
    if (text.length > maxLength) push(`Longer than ${maxLength} characters.`);
    if (/\{%|\{#|\{\{|\}\}/.test(text.replace(/\{\{\s*[a-z][a-z0-9_]*\s*\}\}/g, ""))) push("Template logic ({% %}, {# #} or a stray {{ }}) isn't allowed.");
  }
  return errors;
}

function blockInfo(node: LexNode): BlockInfo {
  if (node.type === "email-slot") return { kind: "slot", wrapper: String(node.wrapper ?? "") };
  if (node.type === "email-group") return { kind: "group", slots: (node.children ?? []).map((s) => ({ wrapper: String(s.wrapper ?? "") })) };
  return { kind: "locked", html: String(node.html ?? "") };
}

export function slotConditions(state: LexicalJson): Map<string, string | null> {
  const email = emailOf(state);
  if (!email) return new Map();
  const blocks = email.children ?? [];
  const flat = blocks.flatMap((b) => (b.type === "email-group" ? (b.children ?? []) : [b]));
  const conditions = blockConditions(blocks.map(blockInfo), email.variables.map((v) => v.name));
  return new Map(flat.flatMap((n, i) => (n.type === "email-slot" ? [[String(n.slotId), conditions[i]] as const] : [])));
}
