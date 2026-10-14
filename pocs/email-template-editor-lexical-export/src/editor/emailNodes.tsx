import {
  $applyNodeReplacement,
  $getRoot,
  DecoratorNode,
  ElementNode,
  type LexicalNode,
  type NodeKey,
  type SerializedElementNode,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";
import type { SlotFormat, TagStyles, Variable } from "../types";
import { LockedBlockView } from "./LockedBlockView";

export const CONTENT_MARKER = "[[content]]";

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
  wrapper: string;
  prefix: string;
  suffix: string;
  blockStyle: string;
  condition: string | null;
  dropIfEmpty: boolean;
  look: "text" | "button";
};

export type SerializedSlotNode = Spread<SlotAttrs, SerializedElementNode>;

const SLOT_KEYS = [
  "slotId",
  "label",
  "slotFormat",
  "required",
  "maxLength",
  "wrapper",
  "prefix",
  "suffix",
  "blockStyle",
  "condition",
  "dropIfEmpty",
  "look",
] as const;

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
    const attrs = Object.fromEntries(SLOT_KEYS.map((k) => [k, json[k]])) as SlotAttrs;
    return $createSlotNode(attrs).updateFromJSON(json);
  }

  exportJSON(): SerializedSlotNode {
    return { ...super.exportJSON(), ...this.__attrs };
  }

  createDOM(): HTMLElement {
    const a = this.__attrs;
    const dom = document.createElement("div");
    dom.className = `email-slot email-slot-${a.slotFormat}${a.look === "button" ? " email-slot-button" : ""}`;
    dom.dataset.slot = a.slotId;
    dom.dataset.placeholder = a.required ? `Add a ${a.label.toLowerCase()}` : `Add a ${a.label.toLowerCase()} (optional)`;
    if (a.condition) dom.dataset.condition = a.condition;
    const style = a.slotFormat === "rich" ? displayStyle(a.blockStyle) : displayStyle(innermostStyle(a.wrapper) ?? "", a.look === "button");
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

export type SerializedGroupNode = Spread<{ groupId: string; wrapper: string }, SerializedElementNode>;

export class GroupNode extends ElementNode {
  __groupId: string;
  __wrapper: string;

  static getType(): string {
    return "email-group";
  }

  static clone(node: GroupNode): GroupNode {
    return new GroupNode(node.__groupId, node.__wrapper, node.__key);
  }

  constructor(groupId: string, wrapper: string, key?: NodeKey) {
    super(key);
    this.__groupId = groupId;
    this.__wrapper = wrapper;
  }

  static importJSON(json: SerializedGroupNode): GroupNode {
    return $createGroupNode(json.groupId, json.wrapper).updateFromJSON(json);
  }

  exportJSON(): SerializedGroupNode {
    return { ...super.exportJSON(), groupId: this.__groupId, wrapper: this.__wrapper };
  }

  createDOM(): HTMLElement {
    const dom = document.createElement("div");
    dom.className = "email-group";
    const style = displayStyle(innermostStyle(this.__wrapper) ?? "");
    if (style) dom.style.cssText = style;
    return dom;
  }

  updateDOM(): false {
    return false;
  }

  getGroupId(): string {
    return this.getLatest().__groupId;
  }

  getWrapper(): string {
    return this.getLatest().__wrapper;
  }

  canBeEmpty(): false {
    return false;
  }

  canIndent(): false {
    return false;
  }
}

export type SerializedLockedBlockNode = Spread<{ blockId: string; label: string; html: string; condition: string | null }, SerializedLexicalNode>;

export class LockedBlockNode extends DecoratorNode<JSX.Element> {
  __blockId: string;
  __label: string;
  __html: string;
  __condition: string | null;

  static getType(): string {
    return "email-locked";
  }

  static clone(node: LockedBlockNode): LockedBlockNode {
    return new LockedBlockNode(node.__blockId, node.__label, node.__html, node.__condition, node.__key);
  }

  constructor(blockId: string, label: string, html: string, condition: string | null, key?: NodeKey) {
    super(key);
    this.__blockId = blockId;
    this.__label = label;
    this.__html = html;
    this.__condition = condition;
  }

  static importJSON(json: SerializedLockedBlockNode): LockedBlockNode {
    return $createLockedBlockNode(json.blockId, json.label, json.html, json.condition ?? null).updateFromJSON(json);
  }

  exportJSON(): SerializedLockedBlockNode {
    return { ...super.exportJSON(), blockId: this.__blockId, label: this.__label, html: this.__html, condition: this.__condition };
  }

  createDOM(): HTMLElement {
    const dom = document.createElement("div");
    dom.className = isInvisible(this.__html) ? "email-locked email-locked-hidden" : "email-locked";
    dom.dataset.block = this.__blockId;
    return dom;
  }

  updateDOM(): false {
    return false;
  }

  getBlockId(): string {
    return this.getLatest().__blockId;
  }

  getHtml(): string {
    return this.getLatest().__html;
  }

  getCondition(): string | null {
    return this.getLatest().__condition;
  }

  isInline(): false {
    return false;
  }

  isKeyboardSelectable(): false {
    return false;
  }

  decorate(): JSX.Element {
    return <LockedBlockView html={this.__html} condition={this.__condition} />;
  }
}

export function $createEmailNode(frame: string, variables: Variable[], textStyles: TagStyles): EmailNode {
  return $applyNodeReplacement(new EmailNode(frame, variables, textStyles));
}

export function $createSlotNode(attrs: SlotAttrs): SlotNode {
  return $applyNodeReplacement(new SlotNode(attrs));
}

export function $createGroupNode(groupId: string, wrapper: string): GroupNode {
  return $applyNodeReplacement(new GroupNode(groupId, wrapper));
}

export function $createLockedBlockNode(blockId: string, label: string, html: string, condition: string | null = null): LockedBlockNode {
  return $applyNodeReplacement(new LockedBlockNode(blockId, label, html, condition));
}

export const $isEmailNode = (n: LexicalNode | null | undefined): n is EmailNode => n instanceof EmailNode;
export const $isSlotNode = (n: LexicalNode | null | undefined): n is SlotNode => n instanceof SlotNode;
export const $isGroupNode = (n: LexicalNode | null | undefined): n is GroupNode => n instanceof GroupNode;
export const $isLockedBlockNode = (n: LexicalNode | null | undefined): n is LockedBlockNode => n instanceof LockedBlockNode;

export function $getEmailNode(): EmailNode | null {
  const first = $getRoot().getFirstChild();
  return $isEmailNode(first) ? first : null;
}

export function $getSlots(): SlotNode[] {
  const email = $getEmailNode();
  if (!email) return [];
  return email.getChildren().flatMap((c) => ($isSlotNode(c) ? [c] : $isGroupNode(c) ? c.getChildren().filter($isSlotNode) : []));
}

function $describe(node: LexicalNode): unknown {
  if ($isSlotNode(node)) return ["slot", node.getAttrs()];
  if ($isLockedBlockNode(node)) return ["locked", node.getBlockId(), node.getHtml(), node.getCondition()];
  if ($isGroupNode(node)) return ["group", node.getGroupId(), node.getWrapper(), node.getChildren().map($describe)];
  return ["other", node.getType()];
}

export function $structure(): string {
  const root = $getRoot();
  const email = $getEmailNode();
  if (!email || root.getChildrenSize() !== 1) return "invalid";
  return JSON.stringify([email.getFrame(), email.getVariables(), email.getTextStyles(), email.getChildren().map($describe)]);
}

export function $findSlot(node: LexicalNode | null): SlotNode | null {
  let current: LexicalNode | null = node;
  while (current) {
    if ($isSlotNode(current)) return current;
    current = current.getParent();
  }
  return null;
}

const KEEP_TEXT = /^(font-size|font-weight|font-style|color|line-height|letter-spacing|text-transform|text-align)$/;
const KEEP_BUTTON = /^(font-size|font-weight|color|line-height|background-color|padding|border-radius|text-align)$/;

function innermostStyle(wrapper: string): string | null {
  const before = wrapper.slice(0, Math.max(0, wrapper.indexOf(CONTENT_MARKER)));
  const tags = [...before.matchAll(/<(p|div|td|a|h[1-6])\b[^>]*\bstyle="([^"]*)"/g)];
  return tags.length ? tags[tags.length - 1][2] : null;
}

function displayStyle(style: string, button = false): string {
  const keep = button ? KEEP_BUTTON : KEEP_TEXT;
  const declarations = style
    .split(";")
    .map((d) => d.trim())
    .filter((d) => keep.test(d.split(":")[0]?.trim() ?? ""));
  if (button && !declarations.some((d) => d.startsWith("text-align"))) declarations.push("text-align: center");
  return declarations.join("; ");
}

function isInvisible(html: string): boolean {
  return html.replace(/\{%-?[\s\S]*?-?%\}/g, "").replace(/<!--[\s\S]*?-->/g, "").trim() === "";
}
