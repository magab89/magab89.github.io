import { $isLinkNode } from "@lexical/link";
import { $isListItemNode, $isListNode } from "@lexical/list";
import {
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type LexicalNode,
  type TextNode,
} from "lexical";
import { escapeHtml } from "../compile";
import { $isVariableNode } from "./VariableNode";

function wrapFormat(node: TextNode, inner: string): string {
  let out = inner;
  if (node.hasFormat("strikethrough")) out = `<s>${out}</s>`;
  if (node.hasFormat("underline")) out = `<u>${out}</u>`;
  if (node.hasFormat("italic")) out = `<em>${out}</em>`;
  if (node.hasFormat("bold")) out = `<strong>${out}</strong>`;
  return out;
}

function serializeNode(node: LexicalNode): string {
  if ($isVariableNode(node)) return wrapFormat(node, `{{ ${node.getVariable()} }}`);
  if ($isTextNode(node)) return wrapFormat(node, escapeHtml(node.getTextContent()));
  if ($isLineBreakNode(node)) return "<br>";
  if (!$isElementNode(node)) return "";

  const inner = node.getChildren().map(serializeNode).join("");
  if ($isParagraphNode(node)) return `<p>${inner || "<br>"}</p>`;
  if ($isListNode(node)) {
    const tag = node.getListType() === "number" ? "ol" : "ul";
    return `<${tag}>${inner}</${tag}>`;
  }
  if ($isListItemNode(node)) return `<li>${inner}</li>`;
  if ($isLinkNode(node)) return `<a href="${escapeHtml(node.getURL())}">${inner}</a>`;
  return inner;
}

export function $serializeRich(): string {
  const root = $getRoot();
  if (root.getTextContent().trim() === "" && !root.getAllTextNodes().some($isVariableNode)) return "";
  return root.getChildren().map(serializeNode).join("");
}

export function $serializePlain(): string {
  return $getRoot()
    .getAllTextNodes()
    .map((n) => ($isVariableNode(n) ? `{{ ${n.getVariable()} }}` : n.getTextContent()))
    .join("");
}
