import { createHeadlessEditor } from "@lexical/headless";
import { $generateNodesFromDOM } from "@lexical/html";
import { $createParagraphNode, $createTextNode, $getRoot, $isElementNode, type LexicalEditor, type LexicalNode } from "lexical";
import type { LexicalJson } from "../lexicalJson";
import type { TextSlot, Variable } from "../types";
import { registerSlotRules, nodesFor } from "./rules";
import { $serializePlain, $serializeRich } from "./serialize";

function headless(format: TextSlot["format"], variables: Variable[]): LexicalEditor {
  const editor = createHeadlessEditor({
    namespace: "headless",
    nodes: nodesFor(format),
    onError: (e) => {
      throw e;
    },
  });
  registerSlotRules(editor, format, variables);
  return editor;
}

export function $loadValue(editor: LexicalEditor, value: string, format: TextSlot["format"]) {
  const root = $getRoot().clear();
  if (format === "plain") {
    const paragraph = $createParagraphNode();
    if (value) paragraph.append($createTextNode(value));
    root.append(paragraph);
    return;
  }
  const dom = new DOMParser().parseFromString(value || "<p></p>", "text/html");
  let loose: LexicalNode[] = [];
  const flush = () => {
    if (loose.length) root.append($createParagraphNode().append(...loose));
    loose = [];
  };
  for (const node of $generateNodesFromDOM(editor, dom)) {
    if ($isElementNode(node) && !node.isInline()) {
      flush();
      root.append(node);
    } else {
      loose.push(node);
    }
  }
  flush();
  if (root.getChildrenSize() === 0) root.append($createParagraphNode());
}

export function valueToLexicalJson(value: string, format: TextSlot["format"], variables: Variable[]): LexicalJson {
  const editor = headless(format, variables);
  editor.update(() => $loadValue(editor, value, format), { discrete: true });
  return editor.getEditorState().toJSON() as unknown as LexicalJson;
}

export function lexicalJsonToHtmlViaLexical(json: LexicalJson, format: TextSlot["format"]): string {
  const editor = createHeadlessEditor({ namespace: "headless", nodes: nodesFor(format), onError: (e) => { throw e; } });
  editor.setEditorState(editor.parseEditorState(JSON.stringify(json)));
  return editor.getEditorState().read(() => (format === "rich" ? $serializeRich() : $serializePlain()));
}
