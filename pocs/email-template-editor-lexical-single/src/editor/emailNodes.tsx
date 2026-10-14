import {
  $applyNodeReplacement,
  $getRoot,
  DecoratorNode,
  ElementNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedElementNode,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";
import type { SlotFormat, TagStyles, Variable } from "../types";
import { LockedBlockView } from "./LockedBlockView";

export type SerializedEmailNode = Spread<{ frame: string; variables: Variable[]; textStyles: TagStyles }, SerializedElementNode>;

export class EmailNode extends ElementNode {
  __frame: string;
  __variables: Variable[];
  __textStyles: TagStyles;

  static getType(): string {
    return "email";
  }

  static clone(node: EmailNode): EmailNode {
    return new EmailNode(node.__frame, node.__variables, node.__textStyles, node.__key);
  }

  constructor(frame: string, variables: Variable[], textStyles: TagStyles, key?: NodeKey) {
    super(key);
    this.__frame = frame;
    this.__variables = variables;
    this.__textStyles = textStyles;
  }

  static importJSON(json: SerializedEmailNode): EmailNode {
    return $createEmailNode(json.frame, json.variables, json.textStyles).updateFromJSON(json);
  }

  exportJSON(): SerializedEmailNode {
    return { ...super.exportJSON(), frame: this.__frame, variables: this.__variables, textStyles: this.__textStyles };
  }

  createDOM(): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "email-doc";
    return dom;
  }

  updateDOM(): false {
    return false;
  }

  getVariables(): Variable[] {
    return this.getLatest().__variables;
  }

  getFrame(): string {
    return this.getLatest().__frame;
  }

  getTextStyles(): TagStyles {
    return this.getLatest().__textStyles;
  }

  canBeEmpty(): false {
    return false;
  }

  canIndent(): false {
    return false;
  }
}

export type SlotAttrs = {
  slotId: string;
  label: string;
  slotFormat: SlotFormat;
  required: boolean;
  maxLength: number | null;
  before: string;
  after: string;
  condition: string | null;
  dropIfEmpty: boolean;
};

export type SerializedSlotNode = Spread<SlotAttrs, SerializedElementNode>;

export class SlotNode extends ElementNode {
  __attrs: SlotAttrs;

  static getType(): string {
    return "email-slot";
  }

  static clone(node: SlotNode): SlotNode {
    return new SlotNode(node.__attrs, node.__key);
  }

  constructor(attrs: SlotAttrs, key?: NodeKey) {
    super(key);
    this.__attrs = attrs;
  }

  static importJSON(json: SerializedSlotNode): SlotNode {
    const { slotId, label, slotFormat, required, maxLength, before, after, condition, dropIfEmpty } = json;
    return $createSlotNode({ slotId, label, slotFormat, required, maxLength, before, after, condition, dropIfEmpty }).updateFromJSON(json);
  }

  exportJSON(): SerializedSlotNode {
    return { ...super.exportJSON(), ...this.__attrs };
  }

  createDOM(): HTMLElement {
    const a = this.__attrs;
    const dom = document.createElement("div");
    dom.className = `email-slot email-slot-${a.slotFormat}`;
    dom.dataset.slot = a.slotId;
    dom.dataset.placeholder = a.required ? `Add a ${a.label.toLowerCase()}` : `Add a ${a.label.toLowerCase()} (optional)`;
    if (a.condition) dom.dataset.condition = a.condition;
    const style = wrapperStyle(a.before);
    if (style) dom.style.cssText = style;
    return dom;
  }

  updateDOM(): false {
    return false;
  }

  getAttrs(): SlotAttrs {
    return this.getLatest().__attrs;
  }

  isShadowRoot(): true {
    return true;
  }

  canBeEmpty(): false {
    return false;
  }

  canIndent(): false {
    return false;
  }
}

export type SerializedLockedBlockNode = Spread<{ blockId: string; label: string; html: string }, SerializedLexicalNode>;

export class LockedBlockNode extends DecoratorNode<JSX.Element> {
  __blockId: string;
  __label: string;
  __html: string;

  static getType(): string {
    return "email-locked";
  }

  static clone(node: LockedBlockNode): LockedBlockNode {
    return new LockedBlockNode(node.__blockId, node.__label, node.__html, node.__key);
  }

  constructor(blockId: string, label: string, html: string, key?: NodeKey) {
    super(key);
    this.__blockId = blockId;
    this.__label = label;
    this.__html = html;
  }

  static importJSON(json: SerializedLockedBlockNode): LockedBlockNode {
    return $createLockedBlockNode(json.blockId, json.label, json.html).updateFromJSON(json);
  }

  exportJSON(): SerializedLockedBlockNode {
    return { ...super.exportJSON(), blockId: this.__blockId, label: this.__label, html: this.__html };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "email-locked";
    dom.dataset.block = this.__blockId;
    return dom;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): false {
    return false;
  }

  getBlockId(): string {
    return this.getLatest().__blockId;
  }

  getHtml(): string {
    return this.getLatest().__html;
  }

  isKeyboardSelectable(): false {
    return false;
  }

  decorate(): JSX.Element {
    return <LockedBlockView html={this.__html} />;
  }
}

export function $createEmailNode(frame: string, variables: Variable[], textStyles: TagStyles): EmailNode {
  return $applyNodeReplacement(new EmailNode(frame, variables, textStyles));
}

export function $createSlotNode(attrs: SlotAttrs): SlotNode {
  return $applyNodeReplacement(new SlotNode(attrs));
}

export function $createLockedBlockNode(blockId: string, label: string, html: string): LockedBlockNode {
  return $applyNodeReplacement(new LockedBlockNode(blockId, label, html));
}

export const $isEmailNode = (n: LexicalNode | null | undefined): n is EmailNode => n instanceof EmailNode;
export const $isSlotNode = (n: LexicalNode | null | undefined): n is SlotNode => n instanceof SlotNode;
export const $isLockedBlockNode = (n: LexicalNode | null | undefined): n is LockedBlockNode => n instanceof LockedBlockNode;

export function $getEmailNode(): EmailNode | null {
  const first = $getRoot().getFirstChild();
  return $isEmailNode(first) ? first : null;
}

export function $structure(): string {
  const root = $getRoot();
  const email = $getEmailNode();
  if (!email || root.getChildrenSize() !== 1) return "invalid";
  return JSON.stringify([
    email.getFrame(),
    email.getVariables(),
    email.getTextStyles(),
    email.getChildren().map((c) =>
      $isSlotNode(c) ? ["slot", c.getAttrs()] : $isLockedBlockNode(c) ? ["locked", c.getBlockId(), c.getHtml()] : ["other", c.getType()],
    ),
  ]);
}

export function $findSlot(node: LexicalNode | null): SlotNode | null {
  let current: LexicalNode | null = node;
  while (current) {
    if ($isSlotNode(current)) return current;
    current = current.getParent();
  }
  return null;
}

const KEEP = /^(font-size|font-weight|font-style|color|line-height|letter-spacing|text-transform)$/;

function wrapperStyle(before: string): string {
  const tags = [...before.matchAll(/<(p|div|td|h[1-6])\b[^>]*\bstyle="([^"]*)"/g)];
  const last = tags[tags.length - 1];
  if (!last) return "";
  return last[2]
    .split(";")
    .map((d) => d.trim())
    .filter((d) => KEEP.test(d.split(":")[0]?.trim() ?? ""))
    .join("; ");
}
