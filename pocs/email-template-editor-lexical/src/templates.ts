import type { Doc, EmailDefinition, Node, TagStyles, Variable } from "./types";

const FONT = "font-family:Arial, Helvetica, sans-serif;";
const BODY_TEXT = `font-size:14px; ${FONT} color:#212529; line-height:1.5;`;

const TEXT_STYLES: TagStyles = {
  p: `margin:0 0 16px 0; ${BODY_TEXT}`,
  a: "color:#5227CC; font-weight:500; text-decoration:underline;",
  ul: `margin:0 0 16px 0; padding-left:20px; ${BODY_TEXT}`,
  ol: `margin:0 0 16px 0; padding-left:20px; ${BODY_TEXT}`,
  li: "margin:0 0 4px 0;",
};

const frame = (content: Node[]): Node => ({
  id: "frame",
  type: "frame",
  html:
    '<html><body style="margin:0; padding:0; background-color:#ffffff;">' +
    '<table align="center" style="background-color:#ffffff; width:100%; margin:0 auto; padding:0;" cellpadding="0" cellspacing="0" border="0"><tbody><tr>' +
    '<td align="center" style="padding:24px 8px 8px;">' +
    '<table align="center" style="max-width:600px; width:100%;" cellpadding="0" cellspacing="0" border="0"><tbody><tr>' +
    '<td bgcolor="#ffffff" style="text-align:left;">[[content]]</td>' +
    "</tr></tbody></table></td></tr></tbody></table></body></html>",
  slots: { content: { kind: "nodes", nodes: content } },
});

const greeting = (value: string): Node => ({
  id: "greeting",
  type: "paragraph",
  label: "Greeting",
  html: `<p style="margin:0 0 16px 0; font-size:18px; font-weight:bold; ${FONT} color:#212529; line-height:1.5;">[[text]]</p>`,
  slots: { text: { kind: "text", format: "plain", editable: true, maxLength: 200, value } },
});

const richBlock = (id: string, label: string, margin: string, value: string, required = true, color?: string): Node => ({
  id,
  type: "paragraph",
  label,
  html: `<div style="margin:${margin};">[[text]]</div>`,
  slots: {
    text: {
      kind: "text",
      format: "rich",
      editable: true,
      required,
      maxLength: 5000,
      value,
      ...(color ? { styles: { ...TEXT_STYLES, p: `margin:0 0 16px 0; font-size:14px; ${FONT} color:${color}; line-height:1.5;` } } : {}),
    },
  },
});

const detailRow = (label: string, value: string, last = false) =>
  `<tr><td style="padding:${last ? "12px 0 4px" : "8px 0 12px"};${last ? "" : " border-bottom:1px solid #DEE2E6;"}">` +
  `<p style="margin:0; font-size:12px; ${FONT} color:#6C757D;">${label}</p>` +
  `<p style="margin:2px 0 0; font-size:14px; font-weight:bold; ${FONT} color:#212529;">${value}</p></td></tr>`;

const details = (rows: string): Node => ({
  id: "details",
  type: "details",
  label: "Meeting details",
  html:
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px 0;"><tbody><tr>' +
    '<td style="background-color:#F8F9FA; border:1px solid #E9ECEF; border-radius:12px; padding:12px 16px;">' +
    `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tbody>${rows}</tbody></table>` +
    "</td></tr></tbody></table>",
  slots: {},
});

const button = (href: string, label: string): Node => ({
  id: "cta",
  type: "button",
  label: "Button",
  html:
    '<table width="100%" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td align="center">' +
    `<a href="${href}" target="_blank" style="background-color:#212529; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:12px; font-size:14px; ${FONT} font-weight:700; display:block; text-align:center;">[[label]]</a>` +
    "</td></tr></tbody></table>",
  slots: { label: { kind: "text", format: "plain", editable: false, value: label } },
});

const footer = (unsubscribeText: string | null): Node => ({
  id: "footer",
  type: "footer",
  label: "Footer",
  html:
    '<hr style="border:none; border-top:1px solid #E9ECEF; margin:32px 0 16px;" />' +
    `<p style="margin:0 0 8px; font-size:12px; ${FONT} color:#6C757D;">This email was sent by Acme Scheduling on behalf of {{ advisor_first_name }} {{ advisor_last_name }}{% if firm_name %}, {{ firm_name }}{% endif %}.</p>` +
    `<p style="margin:0 0 8px; font-size:12px; ${FONT} color:#6C757D;">Reply to this email to reach {{ advisor_first_name }} directly.</p>` +
    `{% if firm_business_address %}<p style="margin:0 0 8px; font-size:12px; ${FONT} color:#6C757D;">{{ firm_business_address }}</p>{% endif %}` +
    (unsubscribeText
      ? `{% if unsubscribe_link %}<p style="margin:0; font-size:12px; ${FONT}"><a href="{{ unsubscribe_link }}" target="_blank" style="color:#6C757D; text-decoration:underline;">${unsubscribeText}</a></p>{% endif %}`
      : ""),
  slots: {},
});

const COMMON_VARIABLES: Variable[] = [
  { name: "client_first_name", label: "Client first name", sample: "John", insertable: true },
  { name: "advisor_first_name", label: "Advisor first name", sample: "Jane", insertable: true, fallback: "your advisor" },
  { name: "advisor_last_name", label: "Advisor last name", sample: "Smith", insertable: true, fallback: "" },
  { name: "firm_name", label: "Firm name", sample: "Smith Wealth Partners", insertable: true, fallback: "our firm" },
  { name: "event_type_name", label: "Meeting type", sample: "Annual Review", insertable: true },
  { name: "duration", label: "Duration", sample: "30 minutes", insertable: false },
  { name: "location", label: "Location", sample: "Video call", insertable: false },
  { name: "firm_business_address", label: "Business address", sample: "1 Main St, Boston, MA", insertable: false },
];

const bookInvite: Doc = {
  subject: {
    kind: "text",
    format: "plain",
    editable: true,
    label: "Subject",
    maxLength: 200,
    value: "{{ advisor_first_name }} would like to set up a meeting",
  },
  variables: [
    ...COMMON_VARIABLES,
    { name: "booking_link", label: "Booking link", sample: "https://example.com/book/abc", insertable: false },
    { name: "unsubscribe_link", label: "Unsubscribe link", sample: "https://example.com/unsubscribe", insertable: false },
  ],
  textStyles: TEXT_STYLES,
  body: frame([
    greeting("Hi {{ client_first_name }},"),
    richBlock(
      "message",
      "Message",
      "0 0 16px 0",
      "<p>{{ advisor_first_name }} {{ advisor_last_name }} would like to set up a meeting with you.</p>",
    ),
    details(detailRow("Meeting", "{{ event_type_name }} ({{ duration }})") + detailRow("Location", "{{ location }}", true)),
    button("{{ booking_link }}", "Book a time"),
    richBlock(
      "closing",
      "Closing",
      "32px 0 0 0",
      "<p>None of the times work? Reply to this email and {{ advisor_first_name }} will find another time.</p>",
      false,
      "#495057",
    ),
    footer("Unsubscribe from booking invitations"),
  ]),
};

const cancelMessage: Doc = {
  subject: {
    kind: "text",
    format: "plain",
    editable: true,
    label: "Subject",
    maxLength: 200,
    value: "Your meeting with {{ advisor_first_name }} was canceled",
  },
  variables: [
    ...COMMON_VARIABLES,
    { name: "date", label: "Date", sample: "Tuesday, October 21", insertable: true },
    { name: "time", label: "Time", sample: "10:00 AM EDT", insertable: true },
    { name: "cancel_message", label: "Cancellation note", sample: "Something came up, sorry for the short notice.", insertable: false },
    { name: "event_type_booking_link", label: "Rebooking link", sample: "https://example.com/book/annual", insertable: false },
  ],
  textStyles: TEXT_STYLES,
  body: frame([
    greeting("Hi {{ client_first_name }},"),
    {
      id: "message",
      type: "paragraph",
      label: "Message",
      html: `<p style="margin:0 0 16px 0; ${BODY_TEXT}">[[text]][[rebook_hint]]</p>`,
      slots: {
        text: {
          kind: "text",
          format: "plain",
          editable: true,
          maxLength: 500,
          value: "{{ advisor_first_name }} {{ advisor_last_name }} canceled your meeting.",
        },
        rebook_hint: {
          kind: "node",
          node: {
            id: "rebook_hint",
            label: "Rebooking hint",
            description: "Shown only when the client can book again.",
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
    {
      id: "cancel_note",
      type: "note",
      label: "Advisor's note",
      description: "Shown only when the advisor adds a note while canceling.",
      html:
        `{% if cancel_message %}<p style="margin:0 0 16px 0; padding:12px 16px; background-color:#F8F9FA; border-radius:8px; ${BODY_TEXT}">` +
        "<strong>[[title]]</strong><br />{{ cancel_message }}</p>{% endif %}",
      slots: { title: { kind: "text", format: "plain", editable: false, value: "Note from {{ advisor_first_name }}" } },
    },
    details(detailRow("Meeting", "{{ event_type_name }}") + detailRow("Was scheduled for", "{{ date }} at {{ time }}", true)),
    {
      id: "rebook",
      type: "button",
      label: "Rebook button",
      description: "Shown only when the client can book again.",
      html: `{% if event_type_booking_link %}[[button]]{% endif %}`,
      slots: { button: { kind: "node", node: { ...button("{{ event_type_booking_link }}", "Book a new time"), id: "rebook_cta" } } },
    },
    footer(null),
  ]),
};

export const EMAILS: EmailDefinition[] = [
  { slug: "cl_book_invite", name: "Invitation to book", doc: bookInvite },
  { slug: "cl_cancel_msg", name: "Meeting canceled", doc: cancelMessage },
];
