import { valueToLexicalJson } from "./editor/headless";
import { lexicalJsonToHtml, type LexicalJson } from "./lexicalJson";
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

export function withLexicalContent(doc: Doc): Doc {
  const copy: Doc = structuredClone(doc);
  walkTexts(copy, (_, slot) => {
    if (slot.editable && !slot.content) slot.content = valueToLexicalJson(slot.value ?? "", slot.format, copy.variables);
  });
  return materialize(copy);
}

export function materialize(doc: Doc): Doc {
  walkTexts(doc, (_, slot) => {
    if (slot.editable && slot.content) slot.value = lexicalJsonToHtml(slot.content, slot.format);
  });
  return doc;
}

export function extractContents(doc: Doc): Record<string, LexicalJson> {
  const out: Record<string, LexicalJson> = {};
  walkTexts(doc, (address, slot) => {
    if (slot.editable && slot.content) out[address] = slot.content;
  });
  return out;
}

export function applyContents(doc: Doc, contents: Record<string, LexicalJson>): Doc {
  const copy: Doc = structuredClone(doc);
  walkTexts(copy, (address, slot) => {
    if (slot.editable && address in contents) slot.content = structuredClone(contents[address]);
  });
  return materialize(copy);
}

export function mergeIntoDefault(defaultDoc: Doc, submitted: Doc): Doc {
  return applyContents(defaultDoc, extractContents(submitted));
}

export function toStoredDoc(doc: Doc): Doc {
  const copy: Doc = structuredClone(doc);
  walkTexts(copy, (_, slot) => {
    if (slot.editable) delete (slot as Partial<TextSlot>).value;
  });
  return copy;
}

export function fromStoredDoc(stored: Doc): Doc {
  const copy: Doc = structuredClone(stored);
  walkTexts(copy, (_, slot) => {
    if (slot.editable && slot.value === undefined) slot.value = "";
  });
  return materialize(copy);
}

export function layoutKey(doc: Doc): string {
  return JSON.stringify(toStoredDoc(doc), (key, value) => (key === "content" ? undefined : value));
}
