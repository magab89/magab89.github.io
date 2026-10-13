import type { Doc, EmailDefinition, Node, TagStyles, Variable } from "./types";

const FONT = "font-family:'Plus Jakarta Sans', Arial, Helvetica, sans-serif;";
const BODY_TEXT = `font-size:14px; ${FONT} color:#212529; line-height:24px;`;
const LABEL = `margin:0; font-size:11px; font-weight:bold; letter-spacing:0.44px; text-transform:uppercase; ${FONT} color:#343a40; line-height:16px;`;
const VALUE = `margin:2px 0 0; ${BODY_TEXT}`;
const FOOTER_TEXT = `margin:0; font-size:12px; ${FONT} color:#6c757d; line-height:18px;`;

const TEXT_STYLES: TagStyles = {
  p: `margin:0 0 12px 0; ${BODY_TEXT}`,
  h3: `margin:0 0 8px 0; font-size:16px; font-weight:bold; ${FONT} color:#212529; line-height:24px;`,
  a: "color:#5227cc; font-weight:500; text-decoration:underline;",
  ul: `margin:0 0 12px 0; padding-left:20px; ${BODY_TEXT}`,
  ol: `margin:0 0 12px 0; padding-left:20px; ${BODY_TEXT}`,
  li: "margin:0 0 4px 0;",
};

const condition = (text: string) => `<!--editor:condition ${text}-->`;

const frame = (content: Node[]): Node => ({
  id: "frame",
  type: "frame",
  html:
    '<html><body style="margin:0; padding:0; background-color:#ffffff;">' +
    '<table align="center" style="background-color:#ffffff; width:100%; margin:0 auto; padding:0;" cellpadding="0" cellspacing="0" border="0"><tbody><tr>' +
    '<td align="center" style="padding:24px 8px;">' +
    '<table align="center" style="max-width:600px; width:100%;" cellpadding="0" cellspacing="0" border="0"><tbody><tr>' +
    '<td bgcolor="#ffffff" style="text-align:left;">[[content]]</td>' +
    "</tr></tbody></table></td></tr></tbody></table></body></html>",
  slots: { content: { kind: "nodes", nodes: content } },
});

const greeting = (value: string): Node => ({
  id: "greeting",
  type: "paragraph",
  label: "Greeting",
  html: `<p style="margin:0 0 12px 0; font-size:18px; font-weight:bold; ${FONT} color:#212529; line-height:28px;">[[text]]</p>`,
  slots: { text: { kind: "text", format: "plain", editable: true, maxLength: 200, value } },
});

const richBlock = (id: string, label: string, value: string, required = true): Node => ({
  id,
  type: "paragraph",
  label,
  html: `<div style="margin:0 0 12px 0;">[[text]]</div>`,
  slots: { text: { kind: "text", format: "rich", editable: true, required, maxLength: 5000, value } },
});

const detailRow = (label: string, value: string, first: boolean) =>
  `<tr><td style="padding:12px 0;${first ? "" : " border-top:1px solid #dee2e6;"}">` +
  `<p style="${LABEL}">${label}</p><p style="${VALUE}">${value}</p></td></tr>`;

const noteRow = (guard: string, title: string, conditionText: string, value: string) =>
  `{% if ${guard} %}<tr><td style="padding:12px 0; border-top:1px solid #dee2e6;">` +
  `<p style="${LABEL}">${title}${condition(conditionText)}</p><p style="${VALUE}">${value}</p></td></tr>{% endif %}`;

const details = (rows: string): Node => ({
  id: "details",
  type: "details",
  label: "Meeting details",
  html:
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;"><tbody><tr>' +
    '<td style="background-color:#f8f9fa; border:1px solid #e9ecef; border-radius:12px; padding:4px 16px;">' +
    `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tbody>${rows}</tbody></table>` +
    "</td></tr></tbody></table>",
  slots: {},
});

const button = (id: string, href: string, label: string): Node => ({
  id,
  type: "button",
  label: "Button",
  html:
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;"><tbody><tr>' +
    '<td style="background-color:#f7f7f7; border-radius:12px; padding:6px;">' +
    `<a href="${href}" target="_blank" style="display:block; background-color:#0e6e5c; color:#ffffff; text-decoration:none; padding:15px 24px; border-radius:12px; font-size:15px; font-weight:bold; ${FONT} text-align:center; line-height:18px;">[[label]]</a>` +
    "</td></tr></tbody></table>",
  slots: { label: { kind: "text", format: "plain", editable: false, value: label } },
});

const footer = (unsubscribeText: string | null): Node => ({
  id: "footer",
  type: "footer",
  label: "Footer",
  html:
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 0 0;"><tbody><tr>' +
    '<td style="background-color:#f7f7f7; border-top:1px solid #e9ecef; border-radius:8px; padding:12px 10px 10px;">' +
    `<p style="${FOOTER_TEXT}">This email was sent by Acme Scheduling on behalf of {{ advisor_name }}{% if firm_name %}, {{ firm_name }}{% endif %}.</p>` +
    `<p style="${FOOTER_TEXT} margin-top:8px;">Reply to this email to reach {{ advisor_first_name }} directly.</p>` +
    `{% if firm_business_address %}<p style="${FOOTER_TEXT} margin-top:8px;">{{ firm_business_address }}${condition("Only if the firm has an address")}</p>{% endif %}` +
    (unsubscribeText
      ? `{% if unsubscribe_link %}<p style="${FOOTER_TEXT} margin-top:8px;"><a href="{{ unsubscribe_link }}" target="_blank" style="color:#6c757d; text-decoration:underline;">${unsubscribeText}</a>${condition("Only when an unsubscribe link applies")}</p>{% endif %}`
      : "") +
    "</td></tr></tbody></table>",
  slots: {},
});

const subject = (value: string) => ({
  kind: "text" as const,
  format: "plain" as const,
  editable: true,
  label: "Subject",
  maxLength: 200,
  value,
});

const COMMON_VARIABLES: Variable[] = [
  { name: "client_first_name", label: "Client first name", sample: "John", insertable: true },
  { name: "advisor_name", label: "Advisor name", sample: "Jane Smith", insertable: true, fallback: "your advisor" },
  { name: "advisor_first_name", label: "Advisor first name", sample: "Jane", insertable: true, fallback: "your advisor" },
  { name: "firm_name", label: "Firm name", sample: "Smith Wealth Partners", insertable: true, fallback: "our firm" },
  { name: "event_type_name", label: "Event type", sample: "Annual Review", insertable: true },
  { name: "duration", label: "Duration", sample: "30 minutes", insertable: false },
  { name: "firm_business_address", label: "Business address", sample: "1 Main St, Boston, MA", insertable: false },
];

const bookDeclined: Doc = {
  subject: subject("An update on your meeting request"),
  variables: [
    ...COMMON_VARIABLES,
    { name: "requested_date", label: "Requested date", sample: "Tuesday, October 21", insertable: true },
    { name: "requested_time", label: "Requested time", sample: "10:00 AM", insertable: true },
    { name: "requested_end_time", label: "Requested end time", sample: "10:30 AM", insertable: false },
    { name: "time_zone", label: "Time zone", sample: "EDT", insertable: false },
    { name: "decline_message", label: "Decline message", sample: "I'm traveling that week, sorry!", insertable: false },
    { name: "event_type_booking_link", label: "Booking link", sample: "https://example.com/book/annual", insertable: false },
  ],
  textStyles: TEXT_STYLES,
  body: frame([
    greeting("Hi {{ client_first_name }},"),
    richBlock("message", "Message", "<p>{{ advisor_name }} couldn't confirm your requested time.</p>"),
    details(
      detailRow("Meeting", "{{ event_type_name }} ({{ duration }})", true) +
        detailRow("Requested time", "{{ requested_date }} · {{ requested_time }} – {{ requested_end_time }} ({{ time_zone }})", false) +
        noteRow("decline_message", "Note from {{ advisor_first_name }}", "Only if the advisor adds a note", "{{ decline_message }}"),
    ),
    richBlock("before_button", "Before the button", "<p>{{ advisor_first_name }} would still like to meet. Pick a different time.</p>"),
    button("cta", "{{ event_type_booking_link }}", "Pick a different time"),
    richBlock("closing", "Closing", "", false),
    footer(null),
  ]),
};

const bookInvite: Doc = {
  subject: subject("{{ advisor_first_name }} would like to set up a meeting"),
  variables: [
    ...COMMON_VARIABLES,
    { name: "location", label: "Location", sample: "Video call", insertable: false },
    { name: "booking_link", label: "Booking link", sample: "https://example.com/book/abc", insertable: false },
    { name: "unsubscribe_link", label: "Unsubscribe link", sample: "https://example.com/unsubscribe", insertable: false },
  ],
  textStyles: TEXT_STYLES,
  body: frame([
    greeting("Hi {{ client_first_name }},"),
    richBlock("message", "Message", "<p>{{ advisor_name }} would like to set up a meeting with you.</p>"),
    details(detailRow("Meeting", "{{ event_type_name }} ({{ duration }})", true) + detailRow("Location", "{{ location }}", false)),
    button("cta", "{{ booking_link }}", "Book a time"),
    richBlock("closing", "Closing", "<p>None of the times work? Reply to this email and {{ advisor_first_name }} will find another time.</p>", false),
    footer("Unsubscribe from booking invitations"),
  ]),
};

const cancelMessage: Doc = {
  subject: subject("Your meeting with {{ advisor_first_name }} was canceled"),
  variables: [
    ...COMMON_VARIABLES,
    { name: "date", label: "Date", sample: "Tuesday, October 21", insertable: true },
    { name: "time", label: "Time", sample: "10:00 AM EDT", insertable: true },
    { name: "cancel_message", label: "Cancellation note", sample: "Something came up, sorry for the short notice.", insertable: false },
    { name: "event_type_booking_link", label: "Booking link", sample: "https://example.com/book/annual", insertable: false },
  ],
  textStyles: TEXT_STYLES,
  body: frame([
    greeting("Hi {{ client_first_name }},"),
    {
      id: "message",
      type: "paragraph",
      label: "Message",
      html: `<p style="margin:0 0 12px 0; ${BODY_TEXT}">[[text]][[rebook_hint]]</p>`,
      slots: {
        text: { kind: "text", format: "plain", editable: true, maxLength: 500, value: "{{ advisor_name }} canceled your meeting." },
        rebook_hint: {
          kind: "node",
          node: {
            id: "rebook_hint",
            label: "Rebooking hint",
            description: "Only if the client can book again",
            html: "{% if event_type_booking_link %} [[text]]{% endif %}",
            slots: {
              text: {
                kind: "text",
                format: "plain",
                editable: true,
                required: false,
                maxLength: 300,
                value: "You're welcome to book a new time whenever works for you.",
              },
            },
          },
        },
      },
    },
    details(
      detailRow("Meeting", "{{ event_type_name }}", true) +
        detailRow("Was scheduled for", "{{ date }} at {{ time }}", false) +
        noteRow("cancel_message", "Note from {{ advisor_first_name }}", "Only if the advisor adds a note", "{{ cancel_message }}"),
    ),
    {
      id: "rebook",
      type: "button",
      label: "Rebook button",
      html: `{% if event_type_booking_link %}${condition("Only if the client can book again")}[[button]]{% endif %}`,
      slots: { button: { kind: "node", node: button("rebook_cta", "{{ event_type_booking_link }}", "Book a new time") } },
    },
    footer(null),
  ]),
};

export const EMAILS: EmailDefinition[] = [
  {
    slug: "cl_book_decl",
    name: "Booking request declined",
    description: "Tells the client their requested time couldn't be confirmed and asks them to pick another.",
    purpose: "Booking request declined",
    sentTo: "Clients",
    doc: bookDeclined,
  },
  {
    slug: "cl_book_invite",
    name: "Invitation to book",
    description: "Invites the client to pick a time for a meeting with their advisor.",
    purpose: "Invitation to book",
    sentTo: "Clients",
    doc: bookInvite,
  },
  {
    slug: "cl_cancel_msg",
    name: "Meeting canceled",
    description: "Tells the client their advisor canceled the meeting and how to book again.",
    purpose: "Meeting canceled",
    sentTo: "Clients",
    doc: cancelMessage,
  },
];
