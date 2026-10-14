import {
  $applyNodeReplacement,
  $getRoot,
  $isElementNode,
  DecoratorNode,
  ElementNode,
  type LexicalNode,
  type NodeKey,
  type SerializedElementNode,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";
import type { LexNode } from "../lexicalJson";
import { contentSignature, isButton, slotPlaceholder, type BlockInfo } from "../slotRules";
import type { SlotFormat, Variable } from "../types";
import { LockedBlockView } from "./LockedBlockView";

export const CONTENT_MARKER = "[[content]]";

export type SerializedEmailNode = Spread<{ frame: string; variables: Variable[] }, SerializedElementNode>;

export class EmailNode extends ElementNode {
  __frame: string;
  __variables: Variable[];

  static getType(): string {
    return "email";
  }

  static clone(node: EmailNode): EmailNode {
    return new EmailNode(node.__frame, node.__variables, node.__key);
  }

  constructor(frame: string, variables: Variable[], key?: NodeKey) {
    super(key);
    this.__frame = frame;
    this.__variables = variables;
  }

  static importJSON(json: SerializedEmailNode): EmailNode {
    return $createEmailNode(json.frame, json.variables).updateFromJSON(json);
  }

  exportJSON(): SerializedEmailNode {
    return { ...super.exportJSON(), frame: this.__frame, variables: this.__variables };
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

  canBeEmpty(): false {
    return false;
  }

  canIndent(): false {
    return false;
  }
}

export type SlotAttrs = {
  slotId: string;
  slotFormat: SlotFormat;
  editable: boolean;
  wrapper: string;
};

export type SerializedSlotNode = Spread<SlotAttrs, SerializedElementNode>;

const SLOT_KEYS = ["slotId", "slotFormat", "editable", "wrapper"] as const;

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
    const button = isButton(a.wrapper);
    const dom = document.createElement("div");
    dom.className = `email-slot email-slot-${a.slotFormat}${button ? " email-slot-button" : ""}${a.editable ? "" : " email-slot-locked"}`;
    dom.dataset.slot = a.slotId;
    dom.dataset.placeholder = slotPlaceholder(a);
    if (!a.editable) dom.contentEditable = "false";
    const style = displayStyle(innermostStyle(a.wrapper) ?? "", button);
    if (style) dom.style.cssText = style;
    return dom;
  }

  updateDOM(): false {
    return false;
  }

  getAttrs(): SlotAttrs {
    return this.getLatest().__attrs;
  }

  isEditable(): boolean {
    return this.getLatest().__attrs.editable;
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

export type SerializedLockedBlockNode = Spread<{ blockId: string; html: string }, SerializedLexicalNode>;

export class LockedBlockNode extends DecoratorNode<JSX.Element> {
  __blockId: string;
  __html: string;

  static getType(): string {
    return "email-locked";
  }

  static clone(node: LockedBlockNode): LockedBlockNode {
    return new LockedBlockNode(node.__blockId, node.__html, node.__key);
  }

  constructor(blockId: string, html: string, key?: NodeKey) {
    super(key);
    this.__blockId = blockId;
    this.__html = html;
  }

  static importJSON(json: SerializedLockedBlockNode): LockedBlockNode {
    return $createLockedBlockNode(json.blockId, json.html).updateFromJSON(json);
  }

  exportJSON(): SerializedLockedBlockNode {
    return { ...super.exportJSON(), blockId: this.__blockId, html: this.__html };
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

  isInline(): false {
    return false;
  }

  isKeyboardSelectable(): false {
    return false;
  }

  decorate(): JSX.Element {
    return <LockedBlockView html={this.__html} />;
  }
}

export function $createEmailNode(frame: string, variables: Variable[]): EmailNode {
  return $applyNodeReplacement(new EmailNode(frame, variables));
}

export function $createSlotNode(attrs: SlotAttrs): SlotNode {
  return $applyNodeReplacement(new SlotNode(attrs));
}

export function $createGroupNode(groupId: string, wrapper: string): GroupNode {
  return $applyNodeReplacement(new GroupNode(groupId, wrapper));
}

export function $createLockedBlockNode(blockId: string, html: string): LockedBlockNode {
  return $applyNodeReplacement(new LockedBlockNode(blockId, html));
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

function $toJson(node: LexicalNode): LexNode {
  const json = node.exportJSON() as unknown as LexNode;
  return $isElementNode(node) ? { ...json, children: node.getChildren().map($toJson) } : json;
}

export const $slotContentSignature = (slot: SlotNode) => contentSignature(slot.getChildren().map($toJson));

function $describe(node: LexicalNode): unknown {
  if ($isSlotNode(node)) return ["slot", node.getAttrs(), node.isEditable() ? null : $slotContentSignature(node)];
  if ($isLockedBlockNode(node)) return ["locked", node.getBlockId(), node.getHtml()];
  if ($isGroupNode(node)) return ["group", node.getGroupId(), node.getWrapper(), node.getChildren().map($describe)];
  return ["other", node.getType()];
}

export function $structure(): string {
  const root = $getRoot();
  const email = $getEmailNode();
  if (!email || root.getChildrenSize() !== 1) return "invalid";
  return JSON.stringify([email.getFrame(), email.getVariables(), email.getChildren().map($describe)]);
}

export function $blockInfo(node: LexicalNode): BlockInfo {
  if ($isSlotNode(node)) return { kind: "slot", wrapper: node.getAttrs().wrapper };
  if ($isGroupNode(node)) return { kind: "group", slots: node.getChildren().filter($isSlotNode).map((s) => ({ wrapper: s.getAttrs().wrapper })) };
  return { kind: "locked", html: $isLockedBlockNode(node) ? node.getHtml() : "" };
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
