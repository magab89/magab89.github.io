import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { $unwrapNode, mergeRegister } from "@lexical/utils";
import { $createTextNode, LineBreakNode, TextNode, type Klass, type LexicalEditor, type LexicalNode } from "lexical";
import type { TextSlot, Variable } from "../types";
import { $createVariableNode, VariableNode } from "./VariableNode";

const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g;
export const SAFE_URL = /^(https?:|mailto:)/i;

export const nodesFor = (format: TextSlot["format"]): Klass<LexicalNode>[] =>
  format === "rich" ? [ListNode, ListItemNode, LinkNode, VariableNode] : [VariableNode];

function registerVariableChips(editor: LexicalEditor, variables: Variable[]) {
  const allowed = new Map(variables.filter((v) => v.insertable).map((v) => [v.name, v]));
  return editor.registerNodeTransform(TextNode, (node) => {
    if (!node.isSimpleText()) return;
    const text = node.getTextContent();
    for (const match of text.matchAll(PLACEHOLDER)) {
      const variable = allowed.get(match[1]);
      if (!variable) continue;
      const start = match.index!;
      const end = start + match[0].length;
      let target: TextNode = node;
      if (start > 0 || end < text.length) {
        const parts = node.splitText(start, end);
        target = start === 0 ? parts[0] : parts[1];
      }
      const chip = $createVariableNode(variable.name, variable.label);
      chip.setFormat(target.getFormat());
      target.replace(chip);
      return;
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
    format === "rich" ? registerSafeLinks(editor) : registerSingleLine(editor),
  );
}
