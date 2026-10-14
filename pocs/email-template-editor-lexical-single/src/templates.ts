import catalog from "./templates/catalog.json";
import type { EmailSource, Variable } from "./types";

const bodies = import.meta.glob<string>("./templates/*.html", { query: "?raw", import: "default", eager: true });

const SAMPLES: Record<string, string> = {
  client_first_name: "John",
  client_name: "John Carter",
  client_email: "john.carter@example.com",
  advisor_first_name: "Jane",
  advisor_last_name: "Smith",
  firm_name: "Smith Wealth Partners",
  firm_business_address: "1 Main St, Boston, MA",
  event_type_name: "Annual Review",
  old_event_type_name: "Quarterly Check-in",
  duration: "30 minutes",
  old_duration: "45 minutes",
  location: "Video call",
  old_location: "Office",
  date: "Tuesday, October 21",
  time: "10:00 AM",
  end_time: "10:30 AM",
  timezone: "EDT",
  original_date: "Monday, October 20",
  original_time: "2:00 PM",
  request_summary: "a new meeting",
  request_type: "new",
  booking_source: "your booking page",
  decline_message: "I'm traveling that week, sorry!",
  cancellation_reason: "Something came up, sorry for the short notice.",
  client_message: "Looking forward to it.",
  reschedule_message: "Can we move it to the afternoon?",
  intake_answers: "Goals: retirement planning",
  booking_link: "https://example.com/book/abc",
  event_type_booking_link: "https://example.com/book/annual",
  unsubscribe_link: "https://example.com/unsubscribe",
  booking_unsubscribe_link: "https://example.com/unsubscribe/booking",
  requests_tab_link: "https://example.com/requests",
  booking_details_link: "https://example.com/bookings/1",
  scheduling_dashboard_link: "https://example.com/scheduling",
  manage_booking_link: "https://example.com/manage/1",
  notification_settings_link: "https://example.com/settings/notifications",
};

const NOT_INSERTABLE = new Set([
  "decline_message",
  "cancellation_reason",
  "client_message",
  "reschedule_message",
  "intake_answers",
  "firm_business_address",
  "old_event_type_name",
  "old_duration",
  "old_location",
  "request_type",
]);

const LABELS: Record<string, string> = { timezone: "Time zone", end_time: "End time", client_email: "Client email" };

const humanize = (name: string) => LABELS[name] ?? name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " ");

export function variablesIn(...sources: string[]): Variable[] {
  const names = new Set<string>();
  for (const source of sources) {
    for (const m of source.matchAll(/\{\{\s*([a-z_][a-z0-9_]*)/g)) names.add(m[1]);
    for (const m of source.matchAll(/\{%-?\s*(?:el)?if\s+([^%]+?)\s*-?%\}/g)) {
      for (const id of m[1].matchAll(/\b([a-z_][a-z0-9_]*)\b/g)) {
        if (!["is", "defined", "and", "or", "not", "default", "none", "true", "false"].includes(id[1])) names.add(id[1]);
      }
    }
  }
  return [...names].sort().map((name) => ({
    name,
    label: humanize(name),
    sample: SAMPLES[name] ?? `${humanize(name)} sample`,
    insertable: !NOT_INSERTABLE.has(name) && !name.endsWith("_link"),
  }));
}

export const EMAILS: EmailSource[] = catalog.map((entry) => {
  const body = bodies[`./templates/${entry.slug}.html`];
  if (body === undefined) throw new Error(`Missing body for ${entry.slug}`);
  return {
    ...entry,
    purpose: entry.name,
    sentTo: entry.slug.startsWith("ad_") ? "Advisor" : "Clients",
    body,
  };
});
