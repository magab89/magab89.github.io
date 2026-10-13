import { $generateNodesFromDOM } from "@lexical/html";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { LexicalComposer, type InitialConfigType } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $unwrapNode, mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  FOCUS_COMMAND,
  KEY_ENTER_COMMAND,
  LineBreakNode,
  TextNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { useEffect, useMemo, useState } from "react";
import type { TextSlot, Variable } from "../types";
import { $serializePlain, $serializeRich } from "./serialize";
import { $createVariableNode, VariableNode } from "./VariableNode";

const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g;
const SAFE_URL = /^(https?:|mailto:)/i;

const theme = {
  paragraph: "ed-p",
  list: { ul: "ed-ul", ol: "ed-ol", listitem: "ed-li", nested: { listitem: "ed-li-nested" } },
  link: "ed-link",
  text: { bold: "ed-bold", italic: "ed-italic", underline: "ed-underline", strikethrough: "ed-strike" },
};

export type SlotEditorProps = {
  address: string;
  slot: TextSlot;
  initialValue: string;
  variables: Variable[];
  invalid: boolean;
  onChange: (address: string, value: string) => void;
  onFocus: (address: string, editor: LexicalEditor, format: TextSlot["format"]) => void;
};

export function SlotEditor({ address, slot, initialValue, variables, invalid, onChange, onFocus }: SlotEditorProps) {
  const rich = slot.format === "rich";
  const [length, setLength] = useState(0);

  const initialConfig = useMemo<InitialConfigType>(
    () => ({
      namespace: `slot-${address}`,
      theme,
      nodes: rich ? [ListNode, ListItemNode, LinkNode, VariableNode] : [VariableNode],
      onError: (e) => console.error(e),
      editorState: (editor) => (rich ? $loadRich(editor, initialValue) : $loadPlain(initialValue)),
    }),
    [address, rich],
  );

  const content = (
    <ContentEditable
      className={`slot-input ${rich ? "slot-input-rich" : "slot-input-plain"}`}
      aria-label={slot.label ?? address}
    />
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <span className={`slot ${rich ? "slot-rich" : "slot-plain"}${invalid ? " slot-invalid" : ""}`} data-address={address}>
        {rich ? (
          <RichTextPlugin contentEditable={content} ErrorBoundary={LexicalErrorBoundary} />
        ) : (
          <PlainTextPlugin contentEditable={content} ErrorBoundary={LexicalErrorBoundary} />
        )}
        {slot.maxLength && length > slot.maxLength * 0.8 ? (
          <span className={`slot-count${length > slot.maxLength ? " over" : ""}`}>
            {length}/{slot.maxLength}
          </span>
        ) : null}
      </span>
      <HistoryPlugin />
      {rich ? <ListPlugin /> : <SingleLinePlugin />}
      {rich ? <LinkPlugin validateUrl={(url) => SAFE_URL.test(url)} /> : null}
      {rich ? <SafeLinksPlugin /> : null}
      <VariableChipsPlugin variables={variables} />
      <FocusTrackerPlugin address={address} format={slot.format} onFocus={onFocus} />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(state) =>
          state.read(() => {
            const value = rich ? $serializeRich() : $serializePlain();
            setLength($getRoot().getTextContent().length);
            onChange(address, value);
          })
        }
      />
    </LexicalComposer>
  );
}

function $loadPlain(value: string) {
  const paragraph = $createParagraphNode();
  if (value) paragraph.append($createTextNode(value));
  $getRoot().clear().append(paragraph);
}

function $loadRich(editor: LexicalEditor, value: string) {
  const root = $getRoot().clear();
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

function VariableChipsPlugin({ variables }: { variables: Variable[] }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const allowed = new Map(variables.filter((v) => v.insertable).map((v) => [v.name, v]));
    const unregister = editor.registerNodeTransform(TextNode, (node) => {
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
    editor.update(() => $getRoot().getAllTextNodes().forEach((n) => n.markDirty()), { tag: "historic" });
    return unregister;
  }, [editor, variables]);
  return null;
}

function SafeLinksPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerNodeTransform(LinkNode, (node) => {
        if (!SAFE_URL.test(node.getURL().trim())) $unwrapNode(node);
      }),
    [editor],
  );
  return null;
}

function SingleLinePlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      mergeRegister(
        editor.registerCommand(
          KEY_ENTER_COMMAND,
          (event) => {
            event?.preventDefault();
            return true;
          },
          COMMAND_PRIORITY_HIGH,
        ),
        editor.registerNodeTransform(LineBreakNode, (node) => {
          node.replace($createTextNode(" "));
        }),
      ),
    [editor],
  );
  return null;
}

function FocusTrackerPlugin({
  address,
  format,
  onFocus,
}: {
  address: string;
  format: TextSlot["format"];
  onFocus: SlotEditorProps["onFocus"];
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        FOCUS_COMMAND,
        () => {
          onFocus(address, editor, format);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    [editor, address, format, onFocus],
  );
  return null;
}
