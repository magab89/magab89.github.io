import { compileTemplate } from "./compile";
import { fromStoredDoc, mergeIntoDefault, toStoredDoc, withLexicalContent } from "./doc";
import { EMAILS } from "./templates";
import type { Doc, Template } from "./types";
import { validateDoc, type ValidationError } from "./validate";

export type SavedRow = {
  id: number;
  templateType: string;
  savedAt: string;
  payload: Template;
};

const DB_KEY = "email-template-editor-lexical:db:v1";
const defaults = new Map<string, Doc>();

export function systemDefault(templateType: string): Doc {
  if (!defaults.has(templateType)) {
    const email = EMAILS.find((e) => e.slug === templateType);
    if (!email) throw new Error(`Unknown template type ${templateType}`);
    defaults.set(templateType, withLexicalContent(email.doc));
  }
  return defaults.get(templateType)!;
}

export function listRows(): SavedRow[] {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeRows(rows: SavedRow[]) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(rows));
  } catch {
    return;
  }
}

export function deleteRow(id: number) {
  writeRows(listRows().filter((r) => r.id !== id));
}

export type SaveResult = { ok: true; row: SavedRow } | { ok: false; status: 422; errors: ValidationError[] };

export function buildPayload(templateType: string, submitted: Doc): { payload: Template; errors: ValidationError[] } {
  const merged = mergeIntoDefault(systemDefault(templateType), submitted);
  const compiled = compileTemplate(merged);
  return {
    payload: { schemaVersion: 2, subject: compiled.subject, body: compiled.body, doc: toStoredDoc(merged) },
    errors: validateDoc(merged),
  };
}

export function saveTemplate(templateType: string, submitted: Doc): SaveResult {
  const { payload, errors } = buildPayload(templateType, submitted);
  if (errors.length) return { ok: false, status: 422, errors };
  const rows = listRows();
  const row: SavedRow = {
    id: rows.reduce((max, r) => Math.max(max, r.id), 0) + 1,
    templateType,
    savedAt: new Date().toISOString(),
    payload,
  };
  writeRows([...rows, row]);
  return { ok: true, row };
}

export function parseSavedPayload(text: string): Template {
  const parsed = JSON.parse(text);
  const candidate = parsed?.payload ?? parsed;
  if (candidate?.schemaVersion !== 2 || !candidate.doc?.body || !candidate.doc?.subject) {
    throw new Error("Expected a saved template with schemaVersion 2, subject, body and doc.");
  }
  return candidate as Template;
}

export function recompiledBodyMatches(payload: Template): boolean {
  return compileTemplate(fromStoredDoc(payload.doc)).body === payload.body;
}
