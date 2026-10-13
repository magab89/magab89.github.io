export type Tag = "p" | "a" | "ul" | "ol" | "li" | "strong" | "em" | "u" | "s";

export type TagStyles = Partial<Record<Tag, string>>;

export type Template = {
  schemaVersion: 1;
  subject: string;
  body: string;
  doc: Doc;
};

export type Doc = {
  subject: TextSlot;
  body: Node;
  variables: Variable[];
  textStyles?: TagStyles;
};

export type Node = {
  id: string;
  type?: string;
  label?: string;
  description?: string;
  html: string;
  slots: Record<string, Slot>;
};

export type TextSlot = {
  kind: "text";
  format: "plain" | "rich";
  editable: boolean;
  value: string;
  label?: string;
  required?: boolean;
  maxLength?: number;
  styles?: TagStyles;
};

export type NodeSlot = { kind: "node"; node: Node };
export type NodeListSlot = { kind: "nodes"; nodes: Node[]; editable?: boolean };
export type Slot = TextSlot | NodeSlot | NodeListSlot;

export type Variable = {
  name: string;
  label: string;
  sample: string;
  insertable: boolean;
  fallback?: string;
};

export type EmailDefinition = {
  slug: string;
  name: string;
  doc: Doc;
};

export type EditableText = {
  address: string;
  label: string;
  description?: string;
  slot: TextSlot;
};
