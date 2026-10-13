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
import {
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  FOCUS_COMMAND,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
} from "lexical";
import { useEffect, useMemo, useState } from "react";
import type { LexicalJson } from "../lexicalJson";
import type { TextSlot, Variable } from "../types";
import { $loadValue } from "./headless";
import { nodesFor, registerSlotRules, SAFE_URL } from "./rules";

const theme = {
  paragraph: "ed-p",
  list: { ul: "ed-ul", ol: "ed-ol", listitem: "ed-li", nested: { listitem: "ed-li-nested" } },
  link: "ed-link",
  text: { bold: "ed-bold", italic: "ed-italic", underline: "ed-underline", strikethrough: "ed-strike" },
};

export type SlotEditorProps = {
  address: string;
  slot: TextSlot;
  label?: string;
  variables: Variable[];
  invalid: boolean;
  onChange: (address: string, content: LexicalJson) => void;
  onFocus: (address: string, editor: LexicalEditor, format: TextSlot["format"]) => void;
};

export function SlotEditor({ address, slot, label, variables, invalid, onChange, onFocus }: SlotEditorProps) {
  const rich = slot.format === "rich";
  const [length, setLength] = useState(0);

  const initialConfig = useMemo<InitialConfigType>(
    () => ({
      namespace: `slot-${address}`,
      theme,
      nodes: nodesFor(slot.format),
      onError: (e) => console.error(e),
      editorState: slot.content
        ? JSON.stringify(slot.content)
        : (editor: LexicalEditor) => $loadValue(editor, slot.value, slot.format),
    }),
    [address, slot.format],
  );

  const name = (label ?? slot.label ?? address).toLowerCase();
  const hint = slot.required === false ? `Add a ${name} (optional)` : `Add a ${name}`;
  const content = (
    <ContentEditable
      className={`slot-input ${rich ? "slot-input-rich" : "slot-input-plain"}`}
      aria-label={label ?? slot.label ?? address}
      aria-placeholder={hint}
      placeholder={<span className="slot-placeholder">{hint}</span>}
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
      {rich ? <ListPlugin /> : <BlockEnterPlugin />}
      {rich ? <LinkPlugin validateUrl={(url) => SAFE_URL.test(url)} /> : null}
      <SlotRulesPlugin format={slot.format} variables={variables} />
      <FocusTrackerPlugin address={address} format={slot.format} onFocus={onFocus} />
      <OnChangePlugin
        ignoreSelectionChange
        onChange={(state) => {
          setLength(state.read(() => $getRoot().getTextContent().length));
          onChange(address, state.toJSON() as unknown as LexicalJson);
        }}
      />
    </LexicalComposer>
  );
}

function SlotRulesPlugin({ format, variables }: { format: TextSlot["format"]; variables: Variable[] }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const unregister = registerSlotRules(editor, format, variables);
    editor.update(() => $getRoot().getAllTextNodes().forEach((n) => n.markDirty()), { tag: "historic" });
    return unregister;
  }, [editor, format, variables]);
  return null;
}

function BlockEnterPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(
    () =>
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          event?.preventDefault();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
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
