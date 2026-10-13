import {
  $applyNodeReplacement,
  TextNode,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
} from "lexical";

export type SerializedVariableNode = Spread<{ variable: string }, SerializedTextNode>;

export class VariableNode extends TextNode {
  __variable: string;

  static getType(): string {
    return "variable";
  }

  static clone(node: VariableNode): VariableNode {
    return new VariableNode(node.__variable, node.__text, node.__key);
  }

  constructor(variable: string, label: string, key?: NodeKey) {
    super(label, key);
    this.__variable = variable;
  }

  static importJSON(json: SerializedVariableNode): VariableNode {
    return $createVariableNode(json.variable, json.text).updateFromJSON(json);
  }

  exportJSON(): SerializedVariableNode {
    return { ...super.exportJSON(), variable: this.__variable };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.classList.add("var-chip");
    dom.dataset.variable = this.__variable;
    dom.title = `{{ ${this.__variable} }}`;
    return dom;
  }

  exportDOM(): DOMExportOutput {
    const span = document.createElement("span");
    span.textContent = `{{ ${this.__variable} }}`;
    return { element: span };
  }

  getVariable(): string {
    return this.getLatest().__variable;
  }

  isTextEntity(): true {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

export function $createVariableNode(variable: string, label: string): VariableNode {
  const node = new VariableNode(variable, label);
  node.setMode("token").toggleDirectionless();
  return $applyNodeReplacement(node);
}

export function $isVariableNode(node: LexicalNode | null | undefined): node is VariableNode {
  return node instanceof VariableNode;
}
