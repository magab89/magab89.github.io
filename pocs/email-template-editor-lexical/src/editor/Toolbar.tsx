import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $getNearestNodeOfType } from "@lexical/utils";
import { ListNode } from "@lexical/list";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type LexicalEditor,
  type TextFormatType,
} from "lexical";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TextSlot, Variable } from "../types";
import { $createVariableNode } from "./VariableNode";

export type ActiveSlot = { address: string; label: string; editor: LexicalEditor; format: TextSlot["format"] };

type Marks = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  list: "bullet" | "number" | null;
  link: boolean;
};

const NO_MARKS: Marks = { bold: false, italic: false, underline: false, strikethrough: false, list: null, link: false };

export function Toolbar({ active, variables }: { active: ActiveSlot | null; variables: Variable[] }) {
  const [marks, setMarks] = useState<Marks>(NO_MARKS);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const editor = active?.editor ?? null;
  const rich = active?.format === "rich";

  useEffect(() => {
    setMarks(NO_MARKS);
    setCanUndo(false);
    setCanRedo(false);
    if (!editor) return;
    const read = () =>
      editor.getEditorState().read(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel)) return;
        const anchor = sel.anchor.getNode();
        const list = $getNearestNodeOfType(anchor, ListNode);
        setMarks({
          bold: sel.hasFormat("bold"),
          italic: sel.hasFormat("italic"),
          underline: sel.hasFormat("underline"),
          strikethrough: sel.hasFormat("strikethrough"),
          list: $isListNode(list) ? (list.getListType() === "number" ? "number" : "bullet") : null,
          link: $isLinkNode(anchor.getParent()) || $isLinkNode(anchor),
        });
      });
    read();
    const offUpdate = editor.registerUpdateListener(read);
    const offUndo = editor.registerCommand(CAN_UNDO_COMMAND, (v) => (setCanUndo(v), false), COMMAND_PRIORITY_LOW);
    const offRedo = editor.registerCommand(CAN_REDO_COMMAND, (v) => (setCanRedo(v), false), COMMAND_PRIORITY_LOW);
    return () => {
      offUpdate();
      offUndo();
      offRedo();
    };
  }, [editor]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const format = (f: TextFormatType) => editor?.dispatchCommand(FORMAT_TEXT_COMMAND, f);
  const list = (type: "bullet" | "number") =>
    editor?.dispatchCommand(
      marks.list === type ? REMOVE_LIST_COMMAND : type === "bullet" ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
      undefined,
    );
  const link = () => {
    if (!editor) return;
    if (marks.link) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      return;
    }
    const url = window.prompt("Link address (https://, http:// or mailto:)", "https://");
    if (url && /^(https?:|mailto:)/i.test(url.trim())) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim());
  };
  const insertVariable = (v: Variable) => {
    setMenuOpen(false);
    if (!editor) return;
    editor.update(() => {
      let sel = $getSelection();
      if (!$isRangeSelection(sel)) {
        $getRoot().selectEnd();
        sel = $getSelection();
      }
      if ($isRangeSelection(sel)) sel.insertNodes([$createVariableNode(v.name, v.label)]);
    });
    editor.focus();
  };

  const insertable = variables.filter((v) => v.insertable);

  return (
    <div className="toolbar" role="toolbar" aria-label="Text formatting">
      <span className="toolbar-target">{active ? active.label : "Click a highlighted text to edit it"}</span>
      <div className="toolbar-buttons">
        <Btn label="Undo" disabled={!editor || !canUndo} onClick={() => editor?.dispatchCommand(UNDO_COMMAND, undefined)}>
          ↶
        </Btn>
        <Btn label="Redo" disabled={!editor || !canRedo} onClick={() => editor?.dispatchCommand(REDO_COMMAND, undefined)}>
          ↷
        </Btn>
        <span className="toolbar-sep" />
        <Btn label="Bold" disabled={!rich} pressed={marks.bold} onClick={() => format("bold")}>
          <b>B</b>
        </Btn>
        <Btn label="Italic" disabled={!rich} pressed={marks.italic} onClick={() => format("italic")}>
          <i>I</i>
        </Btn>
        <Btn label="Underline" disabled={!rich} pressed={marks.underline} onClick={() => format("underline")}>
          <u>U</u>
        </Btn>
        <Btn label="Strikethrough" disabled={!rich} pressed={marks.strikethrough} onClick={() => format("strikethrough")}>
          <s>S</s>
        </Btn>
        <span className="toolbar-sep" />
        <Btn label="Bulleted list" disabled={!rich} pressed={marks.list === "bullet"} onClick={() => list("bullet")}>
          •≡
        </Btn>
        <Btn label="Numbered list" disabled={!rich} pressed={marks.list === "number"} onClick={() => list("number")}>
          1≡
        </Btn>
        <Btn label={marks.link ? "Remove link" : "Add link"} disabled={!rich} pressed={marks.link} onClick={link}>
          🔗
        </Btn>
        <span className="toolbar-sep" />
        <div className="var-menu" ref={menuRef}>
          <Btn label="Insert variable" wide disabled={!editor} pressed={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            {"{ }"} Variable
          </Btn>
          {menuOpen && (
            <div className="var-menu-list" role="menu">
              {insertable.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  role="menuitem"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertVariable(v)}
                >
                  <span className="var-chip">{v.label}</span>
                  <code>{`{{ ${v.name} }}`}</code>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Btn({
  label,
  disabled,
  pressed,
  wide,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  wide?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`tb-btn${wide ? " wide" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
