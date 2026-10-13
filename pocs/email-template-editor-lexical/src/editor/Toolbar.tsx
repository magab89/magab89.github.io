import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $createHeadingNode, $isHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $getNearestNodeOfType } from "@lexical/utils";
import {
  $createParagraphNode,
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
import bracesIcon from "../assets/icons/braces.svg";
import bulletsIcon from "../assets/icons/bullets.svg";
import linkIcon from "../assets/icons/link.svg";
import numbersIcon from "../assets/icons/numbers.svg";
import redoIcon from "../assets/icons/redo.svg";
import undoIcon from "../assets/icons/undo.svg";
import updownIcon from "../assets/icons/updown.svg";
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
  block: "paragraph" | "heading";
};

const NO_MARKS: Marks = { bold: false, italic: false, underline: false, strikethrough: false, list: null, link: false, block: "paragraph" };

export function Toolbar({ active, variables }: { active: ActiveSlot | null; variables: Variable[] }) {
  const [marks, setMarks] = useState<Marks>(NO_MARKS);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [menu, setMenu] = useState<"variables" | "style" | null>(null);
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
        const top = anchor.getKey() === "root" ? null : anchor.getTopLevelElement();
        setMarks({
          bold: sel.hasFormat("bold"),
          italic: sel.hasFormat("italic"),
          underline: sel.hasFormat("underline"),
          strikethrough: sel.hasFormat("strikethrough"),
          list: $isListNode(list) ? (list.getListType() === "number" ? "number" : "bullet") : null,
          link: $isLinkNode(anchor.getParent()) || $isLinkNode(anchor),
          block: $isHeadingNode(top) ? "heading" : "paragraph",
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
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

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
  const setBlock = (block: Marks["block"]) => {
    setMenu(null);
    editor?.update(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) $setBlocksType(sel, () => (block === "heading" ? $createHeadingNode("h3") : $createParagraphNode()));
    });
    editor?.focus();
  };
  const insertVariable = (v: Variable) => {
    setMenu(null);
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

  return (
    <div className="toolbar" role="toolbar" aria-label="Text formatting" ref={menuRef}>
      <div className="tool-menu">
        <button
          type="button"
          className="tool-style"
          disabled={!rich}
          aria-haspopup="listbox"
          aria-expanded={menu === "style"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMenu(menu === "style" ? null : "style")}
        >
          <span className="tool-style-aa">Aa</span>
          <span className="tool-style-label">{marks.block === "heading" ? "Heading" : "Normal text"}</span>
          <img src={updownIcon} width={14} height={14} alt="" />
        </button>
        {menu === "style" && (
          <div className="menu-list" role="listbox">
            {(["paragraph", "heading"] as const).map((b) => (
              <button
                key={b}
                type="button"
                role="option"
                aria-selected={marks.block === b}
                className={b === "heading" ? "menu-heading" : ""}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setBlock(b)}
              >
                {b === "heading" ? "Heading" : "Normal text"}
              </button>
            ))}
          </div>
        )}
      </div>
      <Sep />
      <Tool label="Bold" disabled={!rich} pressed={marks.bold} onClick={() => format("bold")}>
        <b>B</b>
      </Tool>
      <Tool label="Italic" disabled={!rich} pressed={marks.italic} onClick={() => format("italic")}>
        <i>I</i>
      </Tool>
      <Tool label="Underline" disabled={!rich} pressed={marks.underline} onClick={() => format("underline")}>
        <u>U</u>
      </Tool>
      <Tool label="Strikethrough" disabled={!rich} pressed={marks.strikethrough} onClick={() => format("strikethrough")}>
        <s>S</s>
      </Tool>
      <Sep />
      <Tool label={marks.link ? "Remove link" : "Add link"} disabled={!rich} pressed={marks.link} onClick={link}>
        <img src={linkIcon} width={16} height={16} alt="" />
      </Tool>
      <Sep />
      <Tool label="Bulleted list" disabled={!rich} pressed={marks.list === "bullet"} onClick={() => list("bullet")}>
        <img src={bulletsIcon} width={16} height={16} alt="" />
      </Tool>
      <Tool label="Numbered list" disabled={!rich} pressed={marks.list === "number"} onClick={() => list("number")}>
        <img src={numbersIcon} width={16} height={16} alt="" />
      </Tool>
      <Sep />
      <div className="tool-menu">
        <button
          type="button"
          className="tool-insert"
          disabled={!editor}
          aria-haspopup="menu"
          aria-expanded={menu === "variables"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMenu(menu === "variables" ? null : "variables")}
        >
          <img src={bracesIcon} width={15} height={15} alt="" />
          Insert variable
        </button>
        {menu === "variables" && (
          <div className="menu-list" role="menu">
            {variables
              .filter((v) => v.insertable)
              .map((v) => (
                <button key={v.name} type="button" role="menuitem" onMouseDown={(e) => e.preventDefault()} onClick={() => insertVariable(v)}>
                  <span className="ph-chip ph-chip-ui">{v.label}</span>
                </button>
              ))}
          </div>
        )}
      </div>
      <Sep />
      <Tool label="Undo" disabled={!editor || !canUndo} onClick={() => editor?.dispatchCommand(UNDO_COMMAND, undefined)}>
        <img src={undoIcon} width={16} height={16} alt="" />
      </Tool>
      <Tool label="Redo" disabled={!editor || !canRedo} onClick={() => editor?.dispatchCommand(REDO_COMMAND, undefined)}>
        <img src={redoIcon} width={16} height={16} alt="" />
      </Tool>
    </div>
  );
}

function Sep() {
  return (
    <span className="tool-sep" aria-hidden="true">
      <span />
    </span>
  );
}

function Tool({
  label,
  disabled,
  pressed,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="tool"
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
