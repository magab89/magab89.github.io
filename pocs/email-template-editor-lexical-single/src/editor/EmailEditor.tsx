import { LexicalComposer, type InitialConfigType } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { mergeRegister } from "@lexical/utils";
import { $getRoot, $getSelection, $isRangeSelection, type LexicalEditor } from "lexical";
import { useEffect, useMemo, useRef } from "react";
import type { LexicalJson } from "../lexicalJson";
import type { Variable } from "../types";
import { $findSlot } from "./emailNodes";
import { EMAIL_NODES, registerContentRules, registerEditingBehaviour } from "./emailRules";
import { VariableLabelsContext } from "./LockedBlockView";
import type { ActiveSlot } from "./Toolbar";

const theme = {
  paragraph: "ed-p",
  heading: { h3: "ed-h3" },
  list: { ul: "ed-ul", ol: "ed-ol", listitem: "ed-li", nested: { listitem: "ed-li-nested" } },
  link: "ed-link",
  text: { bold: "ed-bold", italic: "ed-italic", underline: "ed-underline", strikethrough: "ed-strike" },
};

type Props = {
  initialState: LexicalJson;
  variables: Variable[];
  invalidSlots: string[];
  onChange: (state: LexicalJson) => void;
  onActive: (active: ActiveSlot | null) => void;
  onRejected: () => void;
};

export function EmailEditor({ initialState, variables, invalidSlots, onChange, onActive, onRejected }: Props) {
  const labels = useMemo(() => new Map(variables.map((v) => [v.name, v.label])), [variables]);
  const initialConfig = useMemo<InitialConfigType>(
    () => ({
      namespace: "email",
      theme,
      nodes: EMAIL_NODES,
      editorState: JSON.stringify(initialState),
      onError: (e) => console.error(e),
    }),
    [],
  );
  const invalidCss = invalidSlots.map((id) => `.email-slot[data-slot="${CSS.escape(id)}"]{border-color:var(--error-border)!important}`).join("");

  return (
    <VariableLabelsContext.Provider value={labels}>
      <LexicalComposer initialConfig={initialConfig}>
        <style>{invalidCss}</style>
        <RichTextPlugin contentEditable={<ContentEditable className="email-editor" aria-label="Email" />} ErrorBoundary={LexicalErrorBoundary} />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin validateUrl={(url) => /^(https?:|mailto:)/i.test(url)} />
        <RulesPlugin onRejected={onRejected} />
        <ActiveSlotPlugin onActive={onActive} />
        <OnChangePlugin ignoreSelectionChange onChange={(state) => onChange(state.toJSON() as unknown as LexicalJson)} />
      </LexicalComposer>
    </VariableLabelsContext.Provider>
  );
}

function RulesPlugin({ onRejected }: { onRejected: () => void }) {
  const [editor] = useLexicalComposerContext();
  const rejected = useRef(onRejected);
  rejected.current = onRejected;
  useEffect(() => {
    const off = mergeRegister(
      registerContentRules(editor),
      registerEditingBehaviour(editor, () => rejected.current()),
    );
    editor.update(() => $getRoot().getAllTextNodes().forEach((n) => n.markDirty()), { tag: "historic" });
    return off;
  }, [editor]);
  return null;
}

function ActiveSlotPlugin({ onActive }: { onActive: (active: ActiveSlot | null) => void }) {
  const [editor] = useLexicalComposerContext();
  const last = useRef<string | null>(null);
  const activeEl = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const report = (e: LexicalEditor) =>
      e.getEditorState().read(() => {
        const sel = $getSelection();
        const slot = $isRangeSelection(sel) ? $findSlot(sel.anchor.getNode()) : null;
        const attrs = slot?.getAttrs() ?? null;
        const element = slot ? e.getElementByKey(slot.getKey()) : null;
        if (activeEl.current !== element) {
          activeEl.current?.classList.remove("is-active");
          element?.classList.add("is-active");
          activeEl.current = element;
        }
        const key = attrs ? `${attrs.slotId}:${attrs.slotFormat}` : null;
        if (key === last.current) return;
        last.current = key;
        onActive(attrs ? { address: attrs.slotId, label: attrs.label, format: attrs.slotFormat, editor: e } : null);
      });
    return editor.registerUpdateListener(() => report(editor));
  }, [editor, onActive]);
  return null;
}
