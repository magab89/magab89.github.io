import type { Doc, EditableText, Node, Slot, TextSlot } from "./types";

export const SUBJECT = "subject";

export function walkTexts(doc: Doc, visit: (address: string, slot: TextSlot, owner: Node | null) => void) {
  visit(SUBJECT, doc.subject, null);
  const walkNode = (node: Node) => {
    for (const [name, slot] of Object.entries(node.slots)) walkSlot(node, name, slot);
  };
  const walkSlot = (node: Node, name: string, slot: Slot) => {
    if (slot.kind === "text") visit(`${node.id}.${name}`, slot, node);
    else if (slot.kind === "node") walkNode(slot.node);
    else slot.nodes.forEach(walkNode);
  };
  walkNode(doc.body);
}

export function listEditableTexts(doc: Doc): EditableText[] {
  const out: EditableText[] = [];
  walkTexts(doc, (address, slot, owner) => {
    if (!slot.editable) return;
    out.push({ address, slot, label: slot.label ?? owner?.label ?? address, description: owner?.description });
  });
  return out;
}

export function extractValues(doc: Doc): Record<string, string> {
  const values: Record<string, string> = {};
  walkTexts(doc, (address, slot) => {
    if (slot.editable) values[address] = slot.value;
  });
  return values;
}

export function applyValues(doc: Doc, values: Record<string, string>): Doc {
  const copy: Doc = structuredClone(doc);
  walkTexts(copy, (address, slot) => {
    if (slot.editable && address in values) slot.value = values[address];
  });
  return copy;
}

export function mergeIntoDefault(defaultDoc: Doc, submitted: Doc): Doc {
  return applyValues(defaultDoc, extractValues(submitted));
}
