import { createHeadlessEditor } from "@lexical/headless";
import { $generateNodesFromDOM } from "@lexical/html";
import { $createParagraphNode, $createTextNode, $getRoot, $isElementNode, type LexicalEditor, type LexicalNode } from "lexical";
import { compileText } from "./compile";
import { $createEmailNode, $createLockedBlockNode, $createSlotNode, type SlotAttrs } from "./editor/emailNodes";
import { EMAIL_NODES, registerContentRules } from "./editor/emailRules";
import type { LexicalJson } from "./lexicalJson";
import type { Doc, Node, TextSlot } from "./types";

const MARKER = /\[\[\s*([a-z][a-z0-9_]*)\s*\]\]/g;

type SlotPiece = { address: string; slot: TextSlot; label: string; condition: string | null };
type Piece = string | SlotPiece;

function linearize(node: Node, doc: Doc, out: Piece[], condition: string | null) {
  let last = 0;
  for (const match of node.html.matchAll(MARKER)) {
    out.push(node.html.slice(last, match.index));
    last = match.index! + match[0].length;
    const slot = node.slots[match[1]];
    if (slot.kind === "text") {
      if (slot.editable) {
        out.push({ address: `${node.id}.${match[1]}`, slot, label: slot.label ?? node.label ?? node.id, condition });
      } else {
        out.push(compileText(slot, doc));
      }
    } else if (slot.kind === "node") {
      linearize(slot.node, doc, out, slot.node.description ?? condition);
    } else {
      slot.nodes.forEach((child) => linearize(child, doc, out, child.description ?? condition));
    }
  }
  out.push(node.html.slice(last));
}

function $fillSlot(editor: LexicalEditor, attrs: SlotAttrs, value: string) {
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

const attrsOf = (piece: SlotPiece, before: string, after: string, dropIfEmpty: boolean): SlotAttrs => ({
  slotId: piece.address,
  label: piece.label,
  slotFormat: piece.slot.format,
  required: piece.slot.required !== false,
  maxLength: piece.slot.maxLength ?? null,
  before,
  after,
  condition: piece.condition,
  dropIfEmpty,
});

export function templateToEditorState(doc: Doc): LexicalJson {
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
      const email = $createEmailNode(doc.body.html, doc.variables, doc.textStyles ?? {});
      $getRoot().clear().append(email);
      email.append(
        $fillSlot(
          editor,
          attrsOf({ address: "subject", slot: doc.subject, label: "Subject", condition: null }, "", "", false),
          doc.subject.value,
        ),
      );
      const content = doc.body.slots.content;
      const blocks = content?.kind === "nodes" ? content.nodes : [];
      for (const block of blocks) {
        const pieces: Piece[] = [];
        linearize(block, doc, pieces, block.description ?? null);
        const slotPieces = pieces.filter((p): p is SlotPiece => typeof p !== "string");
        if (slotPieces.length === 0) {
          email.append($createLockedBlockNode(block.id, block.label ?? block.id, pieces.join("")));
          continue;
        }
        let before = "";
        const pending: { piece: SlotPiece; before: string }[] = [];
        for (const piece of pieces) {
          if (typeof piece === "string") before += piece;
          else {
            pending.push({ piece, before });
            before = "";
          }
        }
        pending.forEach(({ piece, before: lead }, i) => {
          const isLast = i === pending.length - 1;
          const attrs = attrsOf(piece, lead, isLast ? before : "", slotPieces.length === 1);
          email.append($fillSlot(editor, attrs, piece.slot.value));
        });
      }
    },
    { discrete: true },
  );
  return editor.getEditorState().toJSON() as unknown as LexicalJson;
}
