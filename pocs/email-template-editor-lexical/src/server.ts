import { compileTemplate } from "./compile";
import { fromStoredDoc, mergeIntoDefault, toStoredDoc, withLexicalContent } from "./doc";
import { EMAILS } from "./templates";
import type { Doc, EmailDefinition, TemplateRecord } from "./types";
import { validateDoc, type ValidationError } from "./validate";

const DB_KEY = "email-template-editor-lexical:db:v2";
const LATENCY_MS = 450;
const defaults = new Map<string, Doc>();

export const emailFor = (templateType: string): EmailDefinition => {
  const email = EMAILS.find((e) => e.slug === templateType);
  if (!email) throw new Error(`Unknown template type "${templateType}"`);
  return email;
};

export function systemDefault(templateType: string): Doc {
  if (!defaults.has(templateType)) defaults.set(templateType, withLexicalContent(emailFor(templateType).doc));
  return defaults.get(templateType)!;
}

export function defaultRecord(templateType: string): TemplateRecord {
  const email = emailFor(templateType);
  const doc = systemDefault(templateType);
  const compiled = compileTemplate(doc);
  return {
    schemaVersion: 2,
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
    subject: compiled.subject,
    body: compiled.body,
    doc: toStoredDoc(doc),
  };
}

export function listRows(): TemplateRecord[] {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeRows(rows: TemplateRecord[]) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(rows));
  } catch {
    return;
  }
}

export function deleteRow(id: number) {
  writeRows(listRows().filter((r) => r.id !== id));
}

export function buildRecord(base: TemplateRecord, working: Doc): { record: TemplateRecord; errors: ValidationError[] } {
  const merged = mergeIntoDefault(systemDefault(base.templateType), working);
  const compiled = compileTemplate(merged);
  const custom = base.meta.access !== "System default";
  return {
    record: {
      ...base,
      name: custom ? base.name : `${emailFor(base.templateType).name}, custom`,
      meta: {
        ...base.meta,
        access: "Account template",
        createdBy: custom ? base.meta.createdBy : "Keith Holmes",
        updatedAt: new Date().toISOString(),
        basedOn: custom ? base.meta.basedOn : null,
      },
      subject: compiled.subject,
      body: compiled.body,
      doc: toStoredDoc(merged),
    },
    errors: validateDoc(merged),
  };
}

export type SaveResult = { ok: true; record: TemplateRecord; created: boolean } | { ok: false; status: 422; errors: ValidationError[] };

export function saveRecord(base: TemplateRecord, working: Doc): SaveResult {
  const { record, errors } = buildRecord(base, working);
  if (errors.length) return { ok: false, status: 422, errors };
  const rows = listRows();
  if (record.id !== null && rows.some((r) => r.id === record.id)) {
    writeRows(rows.map((r) => (r.id === record.id ? record : r)));
    return { ok: true, record, created: false };
  }
  const saved = { ...record, id: rows.reduce((max, r) => Math.max(max, r.id ?? 0), 0) + 1 };
  writeRows([...rows, saved]);
  return { ok: true, record: saved, created: true };
}

export async function fetchRecord(id: number): Promise<TemplateRecord> {
  await new Promise((r) => setTimeout(r, LATENCY_MS));
  const row = listRows().find((r) => r.id === id);
  if (!row) throw new Error(`404: template ${id} not found`);
  return structuredClone(row);
}

export function parseRecord(text: string): TemplateRecord {
  const parsed = JSON.parse(text);
  const record = parsed?.template ?? parsed;
  if (record?.schemaVersion !== 2 || typeof record.templateType !== "string" || !record.doc?.body || !record.doc?.subject) {
    throw new Error("Expected a template record with schemaVersion 2, templateType, subject, body and doc.");
  }
  emailFor(record.templateType);
  return record as TemplateRecord;
}

export function recompiledBodyMatches(record: TemplateRecord): boolean {
  return compileTemplate(fromStoredDoc(record.doc)).body === record.body;
}
