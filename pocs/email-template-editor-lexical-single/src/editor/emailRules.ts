import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { $createHeadingNode, HeadingNode } from "@lexical/rich-text";
import { $restoreEditorState, $unwrapNode, mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  LineBreakNode,
  RootNode,
  SELECT_ALL_COMMAND,
  TextNode,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import {
  $findSlot,
  $getEmailNode,
  $isEmailNode,
  $isSlotNode,
  $structure,
  EmailNode,
  LockedBlockNode,
  SlotNode,
} from "./emailNodes";
import { $createVariableNode, VariableNode } from "./VariableNode";

export const EMAIL_NODES: Klass<LexicalNode>[] = [
  EmailNode,
  SlotNode,
  LockedBlockNode,
  VariableNode,
  HeadingNode,
  ListNode,
  ListItemNode,
  LinkNode,
];

const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/;
const SAFE_URL = /^(https?:|mailto:)/i;

const inPlainSlot = (node: LexicalNode) => $findSlot(node)?.getAttrs().slotFormat === "plain";

function variablesInDoc() {
  const variables = $getEmailNode()?.getVariables() ?? [];
  return {
    labels: new Map(variables.map((v) => [v.name, v.label])),
    insertable: new Set(variables.filter((v) => v.insertable).map((v) => v.name)),
  };
}

export function registerContentRules(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerNodeTransform(TextNode, (node) => {
      if (node.getStyle() !== "") node.setStyle("");
      if (node.getFormat() !== 0 && inPlainSlot(node)) node.setFormat(0);
      if (inPlainSlot(node) && /\s{2,}/.test(node.getTextContent())) node.setTextContent(node.getTextContent().replace(/\s{2,}/g, " "));
      if (!node.isSimpleText()) return;
      const text = node.getTextContent();
      const match = PLACEHOLDER.exec(text);
      if (!match) return;
      const start = match.index;
      const end = start + match[0].length;
      let target: TextNode = node;
      if (start > 0 || end < text.length) {
        const parts = node.splitText(start, end);
        target = start === 0 ? parts[0] : parts[1];
      }
      const { labels } = variablesInDoc();
      const chip = $createVariableNode(match[1], labels.get(match[1]) ?? match[1]);
      chip.setFormat(target.getFormat());
      target.replace(chip);
    }),
    editor.registerNodeTransform(VariableNode, (node) => {
      const { labels, insertable } = variablesInDoc();
      const invalid = !insertable.has(node.getVariable());
      if (node.isInvalid() !== invalid) node.setInvalid(invalid);
      const label = labels.get(node.getVariable()) ?? node.getVariable();
      if (node.getTextContent() !== label) node.setTextContent(label);
      if (node.getStyle() !== "") node.setStyle("");
      if (node.getFormat() !== 0 && inPlainSlot(node)) node.setFormat(0);
    }),
    editor.registerNodeTransform(HeadingNode, (node) => {
      if (node.getTag() !== "h3") {
        const replacement = $createHeadingNode("h3");
        replacement.append(...node.getChildren());
        node.replace(replacement);
      }
    }),
    editor.registerNodeTransform(LinkNode, (node) => {
      if (!SAFE_URL.test(node.getURL().trim())) $unwrapNode(node);
    }),
    editor.registerNodeTransform(LineBreakNode, (node) => {
      if (inPlainSlot(node)) node.replace($createTextNode(" "));
    }),
    editor.registerNodeTransform(SlotNode, (slot) => {
      if (!$isEmailNode(slot.getParent())) {
        slot.remove();
        return;
      }
      if (slot.getChildrenSize() === 0) {
        slot.append($createParagraphNode());
        return;
      }
      const children = slot.getChildren();
      if (slot.getAttrs().slotFormat === "rich") {
        const loose = children.filter((c) => !$isElementNode(c) || c.isInline());
        if (loose.length) {
          const paragraph = $createParagraphNode();
          loose[0].insertBefore(paragraph);
          paragraph.append(...loose);
        }
        return;
      }
      const clean = children.length === 1 && $isParagraphNode(children[0]) && children[0].getChildren().every($isTextNode);
      if (clean) return;
      const paragraph = $createParagraphNode();
      children.forEach((block) => {
        const leaves = $isElementNode(block) ? block.getAllTextNodes() : $isTextNode(block) ? [block] : [];
        if (leaves.length && paragraph.getChildrenSize()) paragraph.append($createTextNode(" "));
        leaves.forEach((leaf) => paragraph.append(leaf));
      });
      children.forEach((c) => c.isAttached() && c.remove());
      slot.append(paragraph);
    }),
    editor.registerNodeTransform(LockedBlockNode, (node) => {
      if (!$isEmailNode(node.getParent())) node.remove();
    }),
    editor.registerNodeTransform(EmailNode, (node) => {
      if (node.getParent()?.getKey() !== "root") node.remove();
    }),
  );
}

export function registerEditingBehaviour(editor: LexicalEditor, onRejected: () => void) {
  const expected = editor.getEditorState().read($structure);
  return mergeRegister(
    editor.registerNodeTransform(RootNode, () => {
      if ($structure() === expected) return;
      $restoreEditorState(editor, editor.getEditorState());
      queueMicrotask(onRejected);
    }),
    editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel)) return false;
        const slot = $findSlot(sel.anchor.getNode());
        if (slot && slot.getAttrs().slotFormat === "rich") return false;
        event?.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      SELECT_ALL_COMMAND,
      () => {
        const sel = $getSelection();
        const slot = $isRangeSelection(sel) ? $findSlot(sel.anchor.getNode()) : null;
        if (slot) slot.select(0, slot.getChildrenSize());
        return true;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
    editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const email = $getEmailNode();
        email?.getChildren().forEach((child) => {
          if (!$isSlotNode(child)) return;
          const empty = child.getTextContent().trim() === "" && !child.getAllTextNodes().some((n) => n instanceof VariableNode);
          editor.getElementByKey(child.getKey())?.classList.toggle("is-empty", empty);
        });
      });
    }),
  );
}
