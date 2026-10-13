import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { $createHeadingNode, HeadingNode } from "@lexical/rich-text";
import { $unwrapNode, mergeRegister } from "@lexical/utils";
import { $createTextNode, LineBreakNode, TextNode, type Klass, type LexicalEditor, type LexicalNode } from "lexical";
import type { TextSlot, Variable } from "../types";
import { $createVariableNode, VariableNode } from "./VariableNode";

const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/;
export const SAFE_URL = /^(https?:|mailto:)/i;

export const nodesFor = (format: TextSlot["format"]): Klass<LexicalNode>[] =>
  format === "rich" ? [HeadingNode, ListNode, ListItemNode, LinkNode, VariableNode] : [VariableNode];

function registerVariableChips(editor: LexicalEditor, variables: Variable[]) {
  const known = new Map(variables.map((v) => [v.name, v]));
  const insertable = new Set(variables.filter((v) => v.insertable).map((v) => v.name));
  return mergeRegister(
    editor.registerNodeTransform(TextNode, (node) => {
      if (!node.isSimpleText()) return;
      const text = node.getTextContent();
      const match = PLACEHOLDER.exec(text);
      PLACEHOLDER.lastIndex = 0;
      if (!match) return;
      const start = match.index;
      const end = start + match[0].length;
      let target: TextNode = node;
      if (start > 0 || end < text.length) {
        const parts = node.splitText(start, end);
        target = start === 0 ? parts[0] : parts[1];
      }
      const name = match[1];
      const chip = $createVariableNode(name, known.get(name)?.label ?? name);
      chip.setFormat(target.getFormat());
      target.replace(chip);
    }),
    editor.registerNodeTransform(VariableNode, (node) => {
      const invalid = !insertable.has(node.getVariable());
      if (node.isInvalid() !== invalid) node.setInvalid(invalid);
      const label = known.get(node.getVariable())?.label ?? node.getVariable();
      if (node.getTextContent() !== label) node.setTextContent(label);
    }),
  );
}

function registerHeadingLevel(editor: LexicalEditor) {
  return editor.registerNodeTransform(HeadingNode, (node) => {
    if (node.getTag() !== "h3") {
      const replacement = $createHeadingNode("h3");
      replacement.append(...node.getChildren());
      node.replace(replacement);
    }
  });
}

function registerNoInlineStyles(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerNodeTransform(TextNode, (node) => {
      if (node.getStyle() !== "") node.setStyle("");
    }),
    editor.registerNodeTransform(VariableNode, (node) => {
      if (node.getStyle() !== "") node.setStyle("");
    }),
  );
}

function registerSafeLinks(editor: LexicalEditor) {
  return editor.registerNodeTransform(LinkNode, (node) => {
    if (!SAFE_URL.test(node.getURL().trim())) $unwrapNode(node);
  });
}

function registerSingleLine(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerNodeTransform(LineBreakNode, (node) => {
      node.replace($createTextNode(" "));
    }),
    editor.registerNodeTransform(TextNode, (node) => {
      if (node.isSimpleText() && /\s{2,}/.test(node.getTextContent())) {
        node.setTextContent(node.getTextContent().replace(/\s{2,}/g, " "));
      }
    }),
  );
}

export function registerSlotRules(editor: LexicalEditor, format: TextSlot["format"], variables: Variable[]) {
  return mergeRegister(
    registerVariableChips(editor, variables),
    registerNoInlineStyles(editor),
    format === "rich" ? mergeRegister(registerSafeLinks(editor), registerHeadingLevel(editor)) : registerSingleLine(editor),
  );
}
