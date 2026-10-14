import { templateToEditorState } from "./convert";
import type { LexicalJson } from "./lexicalJson";
import { compileState, structureOf, validateState, type StateError } from "./stateModel";
import { EMAILS } from "./templates";
import type { EmailRecord, EmailSource } from "./types";

const DB_KEY = "email-template-editor-lexical-single:db:v1";
const LATENCY_MS = 450;
const defaults = new Map<string, LexicalJson>();

export const emailFor = (templateType: string): EmailSource => {
  const email = EMAILS.find((e) => e.slug === templateType);
  if (!email) throw new Error(`Unknown template type "${templateType}"`);
  return email;
};

export function systemDefaultState(templateType: string): LexicalJson {
  if (!defaults.has(templateType)) defaults.set(templateType, templateToEditorState(emailFor(templateType)));
  return defaults.get(templateType)!;
}

export function defaultRecord(templateType: string): EmailRecord {
  const email = emailFor(templateType);
  const editorState = systemDefaultState(templateType);
  const { subject, body } = compileState(editorState);
  return {
    schemaVersion: 3,
    id: null,
    templateType,
    name: "Acme default",
    description: email.description,
    meta: {
      kind: "Scheduling email",
      purpose: email.purpose,
      sentTo: email.sentTo,
      access: "System default",
      createdBy: "Acme",
      updatedAt: "2026-10-02T15:14:00.000Z",
      basedOn: null,
    },
    subject,
    body,
    editorState,
  };
}

export function listRows(): EmailRecord[] {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeRows(rows: EmailRecord[]) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(rows));
  } catch {
    return;
  }
}

export function deleteRow(id: number) {
  writeRows(listRows().filter((r) => r.id !== id));
}

export type CheckedState = { errors: StateError[]; structureMatches: boolean };

export function checkState(templateType: string, editorState: LexicalJson): CheckedState {
  const structureMatches = structureOf(editorState) === structureOf(systemDefaultState(templateType));
  const errors = structureMatches
    ? validateState(editorState)
    : [{ slotId: "", label: "Layout", message: "The locked layout differs from the system default." }];
  return { errors, structureMatches };
}

export function buildRecord(base: EmailRecord, editorState: LexicalJson): EmailRecord {
  const isDefault = base.meta.access === "System default";
  const compiled = (() => {
    try {
      return compileState(editorState);
    } catch {
      return { subject: "", body: "" };
    }
  })();
  return {
    ...base,
    name: isDefault ? `${emailFor(base.templateType).name}, custom` : base.name,
    meta: {
      ...base.meta,
      access: "Account template",
      createdBy: isDefault ? "Keith Holmes" : base.meta.createdBy,
      updatedAt: new Date().toISOString(),
    },
    subject: compiled.subject,
    body: compiled.body,
    editorState,
  };
}

export type SaveResult = { ok: true; record: EmailRecord; created: boolean } | { ok: false; status: 422; errors: StateError[] };

export function saveRecord(base: EmailRecord, editorState: LexicalJson): SaveResult {
  const { errors } = checkState(base.templateType, editorState);
  if (errors.length) return { ok: false, status: 422, errors };
  const record = buildRecord(base, editorState);
  const rows = listRows();
  if (record.id !== null && rows.some((r) => r.id === record.id)) {
    writeRows(rows.map((r) => (r.id === record.id ? record : r)));
    return { ok: true, record, created: false };
  }
  const saved = { ...record, id: rows.reduce((max, r) => Math.max(max, r.id ?? 0), 0) + 1 };
  writeRows([...rows, saved]);
  return { ok: true, record: saved, created: true };
}

export async function fetchRecord(id: number): Promise<EmailRecord> {
  await new Promise((r) => setTimeout(r, LATENCY_MS));
  const row = listRows().find((r) => r.id === id);
  if (!row) throw new Error(`404: template ${id} not found`);
  return structuredClone(row);
}

export function parseRecord(text: string): EmailRecord {
  const parsed = JSON.parse(text);
  const record = parsed?.template ?? parsed;
  if (record?.schemaVersion !== 3 || typeof record.templateType !== "string" || !record.editorState?.root) {
    throw new Error("Expected a template record with schemaVersion 3, templateType, subject, body and editorState.");
  }
  emailFor(record.templateType);
  return record as EmailRecord;
}

export function recompiledBodyMatches(record: EmailRecord): boolean {
  try {
    return compileState(record.editorState).body === record.body;
  } catch {
    return false;
  }
}
