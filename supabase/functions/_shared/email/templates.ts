function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nl2br(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function formatPhp(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

type EmailLayoutParams = {
  preheader?: string;
  heroEyebrow?: string;
  heroTitle: string;
  heroSubtitle: string;
  greeting?: string;
  intro?: string;
  contentHtml: string;
  ctaHtml?: string;
  detailsHtml?: string;
  closingHtml?: string;
  footerNote?: string;
};

function renderEmailLayout({
  preheader,
  heroEyebrow = "Notification",
  heroTitle,
  heroSubtitle,
  greeting,
  intro,
  contentHtml,
  ctaHtml,
  detailsHtml,
  closingHtml,
  footerNote,
}: EmailLayoutParams) {
  return `
  <div style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    ${
      preheader
        ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>`
        : ""
    }

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;padding:32px 16px;background:#eef2f7;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;margin:0 auto;">
            <tr>
              <td style="padding:0;">

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">

                  <tr>
                    <td style="padding:0;background:#ffffff;border-bottom:1px solid #e2e8f0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                        <tr>
                          <td style="padding:26px 32px 0 32px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="padding-right:10px;">
                                  <div style="
                                    background:#2563eb;
                                    padding:8px;
                                    border-radius:10px;
                                    box-shadow:0 6px 16px rgba(37,99,235,0.15);
                                    display:inline-block;
                                  ">
                                    <img
                                      src="https://nlermulroebcmfwvyhmo.supabase.co/storage/v1/object/public/property_media/public/logos/building-2.png"
                                      width="18"
                                      height="18"
                                      alt="Comerciales Flores"
                                      style="display:block;filter:brightness(0) invert(1);"
                                    />
                                  </div>
                                </td>

                                <td>
                                  <div style="
                                    font-size:16px;
                                    font-weight:700;
                                    color:#111827;
                                    letter-spacing:-0.01em;
                                  ">
                                    Commerciales Flores
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <tr>
                          <td align="center" style="padding:24px 32px 28px 32px;">

                            <div style="
                              font-size:64px;
                              font-weight:900;
                              color:#f1f5f9;
                              font-style:italic;
                              line-height:1;
                              user-select:none;
                            ">
                              CF
                            </div>

                            <div style="
                              margin:-18px auto 18px auto;
                              width:64px;
                              height:64px;
                              background:#2563eb;
                              border-radius:14px;
                              transform:rotate(8deg);
                              box-shadow:0 12px 28px rgba(37,99,235,0.20);
                              display:flex;
                              align-items:center;
                              justify-content:center;
                            ">
                              <img
                                src="https://nlermulroebcmfwvyhmo.supabase.co/storage/v1/object/public/property_media/public/logos/building-2.png"
                                width="28"
                                height="28"
                                alt="Comerciales Flores"
                                style="display:block;transform:rotate(-8deg);filter:brightness(0) invert(1);"
                              />
                            </div>

                            <div style="
                              font-size:13px;
                              font-weight:700;
                              letter-spacing:0.08em;
                              text-transform:uppercase;
                              color:#2563eb;
                              margin-bottom:8px;
                            ">
                              ${escapeHtml(heroEyebrow)}
                            </div>

                            <div style="
                              font-size:22px;
                              font-weight:700;
                              color:#111827;
                              margin-bottom:6px;
                            ">
                              ${escapeHtml(heroTitle)}
                            </div>

                            <div style="
                              font-size:14px;
                              color:#64748b;
                              line-height:1.7;
                              max-width:420px;
                              margin:0 auto;
                            ">
                              ${escapeHtml(heroSubtitle)}
                            </div>

                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:0;background:#ffffff;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                        ${
                          greeting
                            ? `
                        <tr>
                          <td style="padding:34px 32px 18px 32px;">
                            <div style="font-size:16px;line-height:1.8;color:#334155;">
                              ${greeting}
                            </div>
                          </td>
                        </tr>
                        `
                            : ""
                        }

                        ${
                          intro
                            ? `
                        <tr>
                          <td style="padding:0 32px 18px 32px;">
                            <div style="font-size:16px;line-height:1.8;color:#334155;">
                              ${intro}
                            </div>
                          </td>
                        </tr>
                        `
                            : ""
                        }

                        <tr>
                          <td style="padding:0 32px 10px 32px;">
                            ${contentHtml}
                          </td>
                        </tr>

                        ${
                          ctaHtml
                            ? `
                        <tr>
                          <td style="padding:18px 32px 10px 32px;">
                            ${ctaHtml}
                          </td>
                        </tr>
                        `
                            : ""
                        }

                        ${
                          detailsHtml
                            ? `
                        <tr>
                          <td style="padding:18px 32px 0 32px;">
                            ${detailsHtml}
                          </td>
                        </tr>
                        `
                            : ""
                        }

                        <tr>
                          <td style="padding:24px 32px 32px 32px;">
                            <div style="font-size:15px;line-height:1.8;color:#475569;">
                              ${
                                closingHtml ??
                                `Regards,<br /><strong style="color:#111827;">Commerciales Flores Support Team</strong>`
                              }
                            </div>
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:22px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                      <div style="font-size:12px;line-height:1.8;color:#64748b;text-align:center;">
                        ${escapeHtml(
                          footerNote ??
                            "This email was sent by Commerciales Flores."
                        )}
                      </div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td
                      align="center"
                      style="
                        padding:22px 32px;
                        background:#2563eb;
                        border-radius:0 0 22px 22px;
                      "
                    >
                      <div style="
                        font-size:13px;
                        font-weight:600;
                        color:#ffffff;
                        margin-bottom:6px;
                      ">
                        Commerciales Flores
                      </div>

                      <div style="
                        font-size:12px;
                        line-height:1.6;
                        color:#dbeafe;
                      ">
                        © 2026 Commerciales Flores. All rights reserved.
                      </div>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
}

function renderInfoCard(params: {
  label: string;
  bodyHtml: string;
  tone?: "blue" | "slate";
}) {
  const tone = params.tone ?? "slate";

  const toneStyles =
    tone === "blue"
      ? {
          border: "#dbeafe",
          background: "#f8fbff",
          label: "#1d4ed8",
        }
      : {
          border: "#e2e8f0",
          background: "#ffffff",
          label: "#64748b",
        };

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${toneStyles.border};border-radius:16px;background:${toneStyles.background};">
      <tr>
        <td style="padding:18px 20px;">
          <div style="font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${toneStyles.label};margin-bottom:8px;">
            ${escapeHtml(params.label)}
          </div>
          <div style="font-size:14px;line-height:1.8;color:#475569;">
            ${params.bodyHtml}
          </div>
        </td>
      </tr>
    </table>
  `;
}

function renderCtaCard(params: {
  title: string;
  description: string;
  buttonLabel: string;
  buttonUrl: string;
  secondaryHtml?: string;
}) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;">
      <tr>
        <td style="padding:20px;">
          <div style="font-size:18px;font-weight:700;line-height:1.4;color:#111827;margin-bottom:8px;">
            ${escapeHtml(params.title)}
          </div>
          <div style="font-size:14px;line-height:1.8;color:#475569;margin-bottom:18px;">
            ${escapeHtml(params.description)}
          </div>

          <a
            href="${escapeHtml(params.buttonUrl)}"
            style="display:inline-block;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;line-height:1;padding:16px 26px;border-radius:12px;box-shadow:0 10px 24px rgba(37,99,235,0.28);"
          >
            ${escapeHtml(params.buttonLabel)}
          </a>

          ${
            params.secondaryHtml
              ? `<div style="margin-top:14px;font-size:13px;line-height:1.8;color:#64748b;">${params.secondaryHtml}</div>`
              : ""
          }
        </td>
      </tr>
    </table>
  `;
}

export function supportReplyTemplate(params: {
  guestFirstName?: string | null;
  ticketPublicId?: string | null;
  ticketId?: string | null;
  ticketSubject?: string | null;
  message: string;
  signupUrl: string;
  loginUrl: string;
}) {
  const ticketLabel = params.ticketPublicId ?? params.ticketId ?? "Support Ticket";

  const text = [
    `Hello${params.guestFirstName ? ` ${params.guestFirstName}` : ""},`,
    "",
    "Thank you for reaching out to Commerciales Flores.",
    "Our support team has responded to your inquiry:",
    "",
    params.message,
    "",
    "Want to continue your inquiry with us?",
    "Create an account to continue your inquiry, manage reservations, and receive updates more easily.",
    "",
    `Create your account: ${params.signupUrl}`,
    `Sign in: ${params.loginUrl}`,
    "",
    `Ticket: ${ticketLabel}`,
    `Subject: ${params.ticketSubject ?? "Support Ticket"}`,
    "",
    "Regards,",
    "Commerciales Flores Support Team",
  ].join("\n");

  const html = renderEmailLayout({
    preheader: "Our support team has replied to your inquiry.",
    heroEyebrow: "Support Reply",
    heroTitle: "We’d love to help you move forward",
    heroSubtitle:
      "Our support team has replied to your inquiry, and your next step is just one click away.",
    greeting: `Hello${
      params.guestFirstName
        ? ` <strong>${escapeHtml(params.guestFirstName)}</strong>`
        : ""
    },`,
    intro:
      'Thank you for reaching out to <strong style="color:#111827;">Commerciales Flores</strong>. We’ve responded to your inquiry below.',
    contentHtml: renderInfoCard({
      label: "Support reply",
      tone: "blue",
      bodyHtml: `<div style="white-space:pre-wrap;">${nl2br(params.message)}</div>`,
    }),
    ctaHtml: renderCtaCard({
      title: "Ready to continue with us?",
      description:
        "Create an account to continue your inquiry, manage reservations, and stay updated with your requests more easily.",
      buttonLabel: "Create Your Account",
      buttonUrl: params.signupUrl,
      secondaryHtml: `Already have an account? <a href="${escapeHtml(
        params.loginUrl
      )}" style="color:#2563eb;text-decoration:none;font-weight:700;">Sign in here</a>.`,
    }),
    detailsHtml: renderInfoCard({
      label: "Ticket details",
      bodyHtml: `
        <div><strong style="color:#334155;">Ticket:</strong> ${escapeHtml(ticketLabel)}</div>
        <div><strong style="color:#334155;">Subject:</strong> ${escapeHtml(
          params.ticketSubject ?? "Support Ticket"
        )}</div>
      `,
    }),
    footerNote:
      "This email was sent in response to your support inquiry with Commerciales Flores.",
  });

  return {
    subject: `Support response — ${ticketLabel}`,
    text,
    html,
  };
}

export function paymentUpdateTemplate(params: {
  customerName?: string | null;
  paymentPublicId: string;
  reservationPublicId?: string | null;
  amount: number;
  action: "verified" | "rejected";
  notes?: string | null;
  appUrl?: string | null;
}) {
  const statusLabel = params.action === "verified" ? "Verified" : "Rejected";

  const text = [
    `Hello${params.customerName ? ` ${params.customerName}` : ""},`,
    "",
    `Your payment ${params.paymentPublicId} has been ${statusLabel.toLowerCase()}.`,
    params.reservationPublicId
      ? `Reservation: ${params.reservationPublicId}`
      : null,
    `Amount: ${formatPhp(params.amount)}`,
    params.notes ? `Notes: ${params.notes}` : null,
    params.appUrl ? `View your payment updates: ${params.appUrl}/payments` : null,
    "",
    "Regards,",
    "Commerciales Flores",
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderEmailLayout({
    preheader:
      params.action === "verified"
        ? "Your payment has been verified."
        : "Your payment needs attention.",
    heroEyebrow: "Payment Update",
    heroTitle:
      params.action === "verified" ? "Your payment has been verified" : "Your payment needs attention",
    heroSubtitle:
      params.action === "verified"
        ? "Your submitted payment has been reviewed and confirmed by our team."
        : "Your submitted payment was reviewed and needs your attention before it can be accepted.",
    greeting: `Hello${
      params.customerName
        ? ` <strong>${escapeHtml(params.customerName)}</strong>`
        : ""
    },`,
    intro:
      params.action === "verified"
        ? 'Thank you for your payment submission. Here is the latest update from <strong style="color:#111827;">Commerciales Flores</strong>.'
        : 'We reviewed your submitted payment. Please see the update below from <strong style="color:#111827;">Commerciales Flores</strong>.',
    contentHtml: renderInfoCard({
      label: "Payment details",
      tone: "blue",
      bodyHtml: `
        <div><strong style="color:#334155;">Payment ID:</strong> ${escapeHtml(
          params.paymentPublicId
        )}</div>
        ${
          params.reservationPublicId
            ? `<div><strong style="color:#334155;">Reservation ID:</strong> ${escapeHtml(
                params.reservationPublicId
              )}</div>`
            : ""
        }
        <div><strong style="color:#334155;">Amount:</strong> ${escapeHtml(
          formatPhp(params.amount)
        )}</div>
        <div><strong style="color:#334155;">Status:</strong> ${escapeHtml(
          statusLabel
        )}</div>
        ${
          params.notes
            ? `<div><strong style="color:#334155;">Notes:</strong> ${escapeHtml(
                params.notes
              )}</div>`
            : ""
        }
      `,
    }),
    ctaHtml: params.appUrl
      ? renderCtaCard({
          title:
            params.action === "verified"
              ? "View your payment record"
              : "Review your payment details",
          description:
            params.action === "verified"
              ? "You can open your account to review the verified payment and related reservation details."
              : "You can open your account to review the payment status and any next steps.",
          buttonLabel: "View Payment",
          buttonUrl: `${params.appUrl}/payments`,
        })
      : undefined,
    footerNote: "This email contains an update about your payment with Commerciales Flores.",
    closingHtml:
      '<strong style="color:#111827;">Commerciales Flores Team</strong>',
  });

  return {
    subject:
      params.action === "verified"
        ? `Payment Verified — ${params.paymentPublicId}`
        : `Payment Update Needed — ${params.paymentPublicId}`,
    text,
    html,
  };
}

export function reservationUpdateTemplate(params: {
  customerName?: string | null;
  reservationPublicId: string;
  action: "approved" | "rejected" | "completed";
  notes?: string | null;
  appUrl?: string | null;
}) {
  const statusLabel =
    params.action === "approved"
      ? "Approved"
      : params.action === "completed"
      ? "Completed"
      : "Rejected";

  const text = [
    `Hello${params.customerName ? ` ${params.customerName}` : ""},`,
    "",
    `Your reservation ${params.reservationPublicId} has been ${statusLabel.toLowerCase()}.`,
    params.notes ? `Notes: ${params.notes}` : null,
    params.appUrl ? `View your reservation: ${params.appUrl}/reservations` : null,
    "",
    "Regards,",
    "Commerciales Flores",
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderEmailLayout({
    preheader: `Your reservation ${params.reservationPublicId} has been updated.`,
    heroEyebrow: "Reservation Update",
    heroTitle:
      params.action === "approved"
        ? "Your reservation has been approved"
        : params.action === "completed"
        ? "Your reservation has been completed"
        : "Your reservation has been updated",
    heroSubtitle:
      params.action === "approved"
        ? "Your reservation request has been approved by our team."
        : params.action === "completed"
        ? "Your reservation has been marked as completed. Thank you for choosing Comerciales Flores."
        : "Your reservation request was reviewed and could not be approved in its current state.",
    greeting: `Hello${
      params.customerName
        ? ` <strong>${escapeHtml(params.customerName)}</strong>`
        : ""
    },`,
    intro:
      'Here is the latest update regarding your reservation with <strong style="color:#111827;">Commerciales Flores</strong>.',
    contentHtml: renderInfoCard({
      label: "Reservation details",
      tone: "blue",
      bodyHtml: `
        <div><strong style="color:#334155;">Reservation ID:</strong> ${escapeHtml(
          params.reservationPublicId
        )}</div>
        <div><strong style="color:#334155;">Status:</strong> ${escapeHtml(
          statusLabel
        )}</div>
        ${
          params.notes
            ? `<div><strong style="color:#334155;">Notes:</strong> ${escapeHtml(
                params.notes
              )}</div>`
            : ""
        }
      `,
    }),
    ctaHtml: params.appUrl
      ? renderCtaCard({
          title:
            params.action === "approved"
              ? "Continue with your reservation"
              : "View your reservation details",
          description:
            params.action === "approved"
              ? "Open your account to review the approved reservation and proceed with the next steps."
              : "Open your account to view the latest reservation details and status.",
          buttonLabel: "View Reservation",
          buttonUrl: `${params.appUrl}/reservations`,
        })
      : undefined,
    footerNote:
      "This email contains an update about your reservation with Commerciales Flores.",
    closingHtml:
      '<strong style="color:#111827;">Commerciales Flores Team</strong>',
  });

  return {
    subject:
      params.action === "approved"
        ? `Reservation Approved — ${params.reservationPublicId}`
        : params.action === "completed"
        ? `Reservation Completed — ${params.reservationPublicId}`
        : `Reservation Update — ${params.reservationPublicId}`,
    text,
    html,
  };
}

function formatDueDate(date: Date) {
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function billingReminderTemplate(params: {
  customerName?: string | null;
  reservationPublicId: string;
  billingType: "monthly" | "quarterly";
  stage: "upcoming" | "due" | "overdue";
  dueDate: Date;
  remainingBalance: number;
  appUrl?: string | null;
}) {
  const greetingName = params.customerName?.trim() || "Valued Client";
  const formattedBalance = formatPhp(params.remainingBalance);
  const formattedDueDate = formatDueDate(params.dueDate);
  const cycleLabel = params.billingType === "monthly" ? "Monthly" : "Quarterly";

  const subject =
    params.stage === "overdue"
      ? `Overdue Billing Reminder — ${params.reservationPublicId}`
      : params.stage === "due"
      ? `Billing Due Today — ${params.reservationPublicId}`
      : `Upcoming Billing Reminder — ${params.reservationPublicId}`;

  const heroTitle =
    params.stage === "overdue"
      ? "Your billing payment is overdue"
      : params.stage === "due"
      ? "Your billing payment is due today"
      : "Your billing payment is coming up";

  const heroSubtitle =
    params.stage === "overdue"
      ? "Your recurring billing payment has passed its due date and needs immediate attention."
      : params.stage === "due"
      ? "This is a reminder that your recurring billing payment is due today."
      : "This is a reminder that your recurring billing payment is due soon.";

  const message =
    params.stage === "overdue"
      ? `Your ${params.billingType} billing payment for reservation ${params.reservationPublicId} is overdue. Remaining balance: ${formattedBalance}.`
      : params.stage === "due"
      ? `Your ${params.billingType} billing payment for reservation ${params.reservationPublicId} is due today. Remaining balance: ${formattedBalance}.`
      : `Your ${params.billingType} billing payment for reservation ${params.reservationPublicId} is due on ${formattedDueDate}. Remaining balance: ${formattedBalance}.`;

  const text = [
    `Hello ${greetingName},`,
    "",
    message,
    "",
    `Reservation: ${params.reservationPublicId}`,
    `Billing Cycle: ${cycleLabel}`,
    `Due Date: ${formattedDueDate}`,
    `Remaining Balance: ${formattedBalance}`,
    params.appUrl ? `Review your account: ${params.appUrl}/payments` : null,
    "",
    "Please settle your payment to avoid service interruptions.",
    "",
    "Regards,",
    "Commerciales Flores",
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderEmailLayout({
    preheader: message,
    heroEyebrow: "Billing Reminder",
    heroTitle,
    heroSubtitle,
    greeting: `Hello <strong>${escapeHtml(greetingName)}</strong>,`,
    intro:
      'This is a billing reminder from <strong style="color:#111827;">Commerciales Flores</strong>. Please review the details below.',
    contentHtml: renderInfoCard({
      label: "Billing summary",
      tone: "blue",
      bodyHtml: `
        <div><strong style="color:#334155;">Reservation:</strong> ${escapeHtml(
          params.reservationPublicId
        )}</div>
        <div><strong style="color:#334155;">Billing Cycle:</strong> ${escapeHtml(
          cycleLabel
        )}</div>
        <div><strong style="color:#334155;">Due Date:</strong> ${escapeHtml(
          formattedDueDate
        )}</div>
        <div><strong style="color:#334155;">Remaining Balance:</strong> ${escapeHtml(
          formattedBalance
        )}</div>
      `,
    }),
    ctaHtml: params.appUrl
      ? renderCtaCard({
          title: "Review your billing details",
          description:
            "Log in to your account to review your reservation and settle your payment.",
          buttonLabel: "Open Account",
          buttonUrl: `${params.appUrl}/payments`,
        })
      : undefined,
    detailsHtml: renderInfoCard({
      label: params.stage === "overdue" ? "Immediate action needed" : "Reminder",
      tone: params.stage === "overdue" ? "slate" : "slate",
      bodyHtml:
        params.stage === "overdue"
          ? "Your payment is already overdue. Please settle it as soon as possible to avoid interruptions."
          : "Please settle your payment on or before the due date to avoid interruptions.",
    }),
    footerNote:
      "This is an automated billing reminder from Commerciales Flores.",
    closingHtml:
      'Regards,<br /><strong style="color:#111827;">Commerciales Flores Billing Team</strong>',
  });

  return {
    subject,
    text,
    html,
    message,
  };
}

function formatManilaDateTime(date: Date) {
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function paymentReminderTemplate(params: {
  customerName?: string | null;
  reservationPublicId: string;
  remainingBalance: number;
  endDate: string | Date;
  stage: "three_day" | "one_day" | "same_day";
  appUrl?: string | null;
}) {
  const greetingName = params.customerName?.trim() || "Valued Client";
  const formattedBalance = formatPhp(params.remainingBalance);
  const endDate =
    params.endDate instanceof Date ? params.endDate : new Date(params.endDate);
  const formattedEndDate = formatManilaDateTime(endDate);

  const subject =
    params.stage === "three_day"
      ? `Payment Reminder — ${params.reservationPublicId}`
      : params.stage === "one_day"
      ? `Upcoming Payment Due — ${params.reservationPublicId}`
      : `Final Payment Reminder — ${params.reservationPublicId}`;

  const heroTitle =
    params.stage === "three_day"
      ? "Your payment deadline is approaching"
      : params.stage === "one_day"
      ? "Your payment is due very soon"
      : "Your payment is due today";

  const heroSubtitle =
    params.stage === "three_day"
      ? "Your reservation is nearing its end date and still has an outstanding balance."
      : params.stage === "one_day"
      ? "Your reservation will end within 1 day and still has an outstanding balance."
      : "Your reservation ends today and still has an outstanding balance that must be settled.";

  const message =
    params.stage === "three_day"
      ? `Your reservation ${params.reservationPublicId} will end on ${formattedEndDate} and still has an outstanding balance of ${formattedBalance}. Please settle your payment before the reservation end date.`
      : params.stage === "one_day"
      ? `Your reservation ${params.reservationPublicId} will end within 1 day and still has an outstanding balance of ${formattedBalance}. Please settle your payment as soon as possible.`
      : `Your reservation ${params.reservationPublicId} ends today and still has an outstanding balance of ${formattedBalance}. Please settle your payment before the reservation period ends.`;

  const text = [
    `Hello ${greetingName},`,
    "",
    message,
    "",
    `Reservation: ${params.reservationPublicId}`,
    `End Date: ${formattedEndDate}`,
    `Outstanding Balance: ${formattedBalance}`,
    params.appUrl ? `View your payment details: ${params.appUrl}/payments` : null,
    "",
    "Please settle your outstanding balance before the reservation end date to avoid interruptions.",
    "",
    "Regards,",
    "Commerciales Flores",
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderEmailLayout({
    preheader: message,
    heroEyebrow: "Payment Reminder",
    heroTitle,
    heroSubtitle,
    greeting: `Hello <strong>${escapeHtml(greetingName)}</strong>,`,
    intro:
      'This is a payment reminder from <strong style="color:#111827;">Commerciales Flores</strong>. Please review the details below.',
    contentHtml: renderInfoCard({
      label: "Reservation summary",
      tone: "blue",
      bodyHtml: `
        <div><strong style="color:#334155;">Reservation:</strong> ${escapeHtml(
          params.reservationPublicId
        )}</div>
        <div><strong style="color:#334155;">End Date:</strong> ${escapeHtml(
          formattedEndDate
        )}</div>
        <div><strong style="color:#334155;">Outstanding Balance:</strong> ${escapeHtml(
          formattedBalance
        )}</div>
      `,
    }),
    ctaHtml: params.appUrl
      ? renderCtaCard({
          title: "Review your payment details",
          description:
            "Log in to your account to review your reservation and settle your outstanding balance.",
          buttonLabel: "Open Account",
          buttonUrl: `${params.appUrl}/payments`,
        })
      : undefined,
    detailsHtml: renderInfoCard({
      label: "Payment reminder",
      tone: "slate",
      bodyHtml:
        "Please settle your outstanding balance before the reservation end date to avoid interruptions.",
    }),
    footerNote:
      "This is an automated payment reminder from Commerciales Flores.",
    closingHtml:
      'Regards,<br /><strong style="color:#111827;">Commerciales Flores Billing Team</strong>',
  });

  return {
    subject,
    message,
    text,
    html,
  };
}


// ADMIN TEMPLATES

export function adminNewReservationTemplate(params: {
  adminName?: string | null;
  customerName?: string | null;
  reservationPublicId: string;
  unitTitle?: string | null;
  unitType?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  amount?: number | null;
  appUrl?: string | null;
}) {
  const greetingName = params.adminName?.trim() || "Admin";
  const formattedAmount =
    typeof params.amount === "number" ? formatPhp(params.amount) : "Not provided";

  const formatDate = (value?: string | Date | null) => {
    if (!value) return "Not provided";
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formattedStartDate = formatDate(params.startDate);
  const formattedEndDate = formatDate(params.endDate);

  const subject = `New Reservation Submitted — ${params.reservationPublicId}`;
  const message = `A new reservation ${params.reservationPublicId} has been submitted${
    params.customerName ? ` by ${params.customerName}` : ""
  } and is waiting for admin review.`;

  const text = [
    `Hello ${greetingName},`,
    "",
    message,
    "",
    `Reservation: ${params.reservationPublicId}`,
    `Customer: ${params.customerName ?? "Not provided"}`,
    `Unit: ${params.unitTitle ?? "Not provided"}`,
    `Unit Type: ${params.unitType ?? "Not provided"}`,
    `Start Date: ${formattedStartDate}`,
    `End Date: ${formattedEndDate}`,
    `Amount: ${formattedAmount}`,
    params.appUrl ? `Review it here: ${params.appUrl}/admin/reservations` : null,
    "",
    "Commerciales Flores",
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderEmailLayout({
    preheader: message,
    heroEyebrow: "Admin Alert",
    heroTitle: "A new reservation needs review",
    heroSubtitle:
      "A customer has submitted a reservation and it is now waiting for admin action.",
    greeting: `Hello <strong>${escapeHtml(greetingName)}</strong>,`,
    intro:
      'A new reservation has been submitted in <strong style="color:#111827;">Commerciales Flores</strong>.',
    contentHtml: renderInfoCard({
      label: "Reservation details",
      tone: "blue",
      bodyHtml: `
        <div><strong style="color:#334155;">Reservation ID:</strong> ${escapeHtml(
          params.reservationPublicId
        )}</div>
        <div><strong style="color:#334155;">Customer:</strong> ${escapeHtml(
          params.customerName ?? "Not provided"
        )}</div>
        <div><strong style="color:#334155;">Unit:</strong> ${escapeHtml(
          params.unitTitle ?? "Not provided"
        )}</div>
        <div><strong style="color:#334155;">Unit Type:</strong> ${escapeHtml(
          params.unitType ?? "Not provided"
        )}</div>
        <div><strong style="color:#334155;">Start Date:</strong> ${escapeHtml(
          formattedStartDate
        )}</div>
        <div><strong style="color:#334155;">End Date:</strong> ${escapeHtml(
          formattedEndDate
        )}</div>
        <div><strong style="color:#334155;">Amount:</strong> ${escapeHtml(
          formattedAmount
        )}</div>
      `,
    }),
    ctaHtml: params.appUrl
      ? renderCtaCard({
          title: "Review reservation",
          description:
            "Open the admin reservations page to review and take action on this request.",
          buttonLabel: "Open Reservations",
          buttonUrl: `${params.appUrl}/admin/reservations`,
        })
      : undefined,
    footerNote: "This admin alert was sent by Commerciales Flores.",
    closingHtml:
      'Regards,<br /><strong style="color:#111827;">Commerciales Flores System</strong>',
  });

  return {
    subject,
    message,
    text,
    html,
  };
}

export function adminPaymentSubmittedTemplate(params: {
  adminName?: string | null;
  customerName?: string | null;
  reservationPublicId?: string | null;
  paymentPublicId: string;
  amount: number;
  paymentCategory?: string | null;
  appUrl?: string | null;
}) {
  const greetingName = params.adminName?.trim() || "Admin";
  const formattedAmount = formatPhp(params.amount);

  const subject = `New Payment Submitted — ${params.paymentPublicId}`;
  const message = `A new payment submission ${params.paymentPublicId}${
    params.customerName ? ` from ${params.customerName}` : ""
  } is waiting for admin review.`;

  const text = [
    `Hello ${greetingName},`,
    "",
    message,
    "",
    `Payment: ${params.paymentPublicId}`,
    `Customer: ${params.customerName ?? "Not provided"}`,
    `Reservation: ${params.reservationPublicId ?? "Not provided"}`,
    `Amount: ${formattedAmount}`,
    `Category: ${params.paymentCategory ?? "payment"}`,
    params.appUrl ? `Review it here: ${params.appUrl}/admin/payments` : null,
    "",
    "Commerciales Flores",
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderEmailLayout({
    preheader: message,
    heroEyebrow: "Admin Alert",
    heroTitle: "A new payment needs review",
    heroSubtitle:
      "A customer has submitted a payment and it is now waiting for admin verification.",
    greeting: `Hello <strong>${escapeHtml(greetingName)}</strong>,`,
    intro:
      'A new payment submission has been received in <strong style="color:#111827;">Commerciales Flores</strong>.',
    contentHtml: renderInfoCard({
      label: "Payment details",
      tone: "blue",
      bodyHtml: `
        <div><strong style="color:#334155;">Payment ID:</strong> ${escapeHtml(
          params.paymentPublicId
        )}</div>
        <div><strong style="color:#334155;">Customer:</strong> ${escapeHtml(
          params.customerName ?? "Not provided"
        )}</div>
        <div><strong style="color:#334155;">Reservation ID:</strong> ${escapeHtml(
          params.reservationPublicId ?? "Not provided"
        )}</div>
        <div><strong style="color:#334155;">Amount:</strong> ${escapeHtml(
          formattedAmount
        )}</div>
        <div><strong style="color:#334155;">Category:</strong> ${escapeHtml(
          params.paymentCategory ?? "payment"
        )}</div>
      `,
    }),
    ctaHtml: params.appUrl
      ? renderCtaCard({
          title: "Review payment",
          description:
            "Open the admin payments page to verify or reject this payment submission.",
          buttonLabel: "Open Payments",
          buttonUrl: `${params.appUrl}/admin/payments`,
        })
      : undefined,
    footerNote: "This admin alert was sent by Commerciales Flores.",
    closingHtml:
      'Regards,<br /><strong style="color:#111827;">Commerciales Flores System</strong>',
  });

  return {
    subject,
    message,
    text,
    html,
  };
}

export function adminNewTicketTemplate(params: {
  adminName?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  ticketPublicId?: string | null;
  ticketId?: string | null;
  subjectLine?: string | null;
  category?: string | null;
  messagePreview?: string | null;
  appUrl?: string | null;
}) {
  const greetingName = params.adminName?.trim() || "Admin";
  const ticketLabel = params.ticketPublicId ?? params.ticketId ?? "Support Ticket";

  const subject = `New Support Ticket — ${ticketLabel}`;
  const message = `A new support ticket ${ticketLabel} has been submitted and is waiting for admin review.`;

  const text = [
    `Hello ${greetingName},`,
    "",
    message,
    "",
    `Ticket: ${ticketLabel}`,
    `Customer: ${params.customerName ?? "Guest / Not provided"}`,
    `Email: ${params.customerEmail ?? "Not provided"}`,
    `Subject: ${params.subjectLine ?? "Support Ticket"}`,
    `Category: ${params.category ?? "Not provided"}`,
    params.messagePreview ? `Message: ${params.messagePreview}` : null,
    params.appUrl ? `Open tickets: ${params.appUrl}/admin/inquiries` : null,
    "",
    "Commerciales Flores",
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderEmailLayout({
    preheader: message,
    heroEyebrow: "Admin Alert",
    heroTitle: "A new support ticket was submitted",
    heroSubtitle:
      "A customer or guest has submitted a support ticket that may need attention.",
    greeting: `Hello <strong>${escapeHtml(greetingName)}</strong>,`,
    intro:
      'A new support ticket has been submitted in <strong style="color:#111827;">Commerciales Flores</strong>.',
    contentHtml: renderInfoCard({
      label: "Ticket details",
      tone: "blue",
      bodyHtml: `
        <div><strong style="color:#334155;">Ticket:</strong> ${escapeHtml(
          ticketLabel
        )}</div>
        <div><strong style="color:#334155;">Customer:</strong> ${escapeHtml(
          params.customerName ?? "Guest / Not provided"
        )}</div>
        <div><strong style="color:#334155;">Email:</strong> ${escapeHtml(
          params.customerEmail ?? "Not provided"
        )}</div>
        <div><strong style="color:#334155;">Subject:</strong> ${escapeHtml(
          params.subjectLine ?? "Support Ticket"
        )}</div>
        <div><strong style="color:#334155;">Category:</strong> ${escapeHtml(
          params.category ?? "Not provided"
        )}</div>
        ${
          params.messagePreview
            ? `<div><strong style="color:#334155;">Preview:</strong> ${escapeHtml(
                params.messagePreview
              )}</div>`
            : ""
        }
      `,
    }),
    ctaHtml: params.appUrl
      ? renderCtaCard({
          title: "Open support tickets",
          description:
            "Open the admin inquiries page to review and respond to this support ticket.",
          buttonLabel: "Open Inquiries",
          buttonUrl: `${params.appUrl}/admin/inquiries`,
        })
      : undefined,
    footerNote: "This admin alert was sent by Commerciales Flores.",
    closingHtml:
      'Regards,<br /><strong style="color:#111827;">Commerciales Flores System</strong>',
  });

  return {
    subject,
    message,
    text,
    html,
  };
}

export function adminTicketReplyTemplate(params: {
  adminName?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  ticketPublicId?: string | null;
  ticketId?: string | null;
  subjectLine?: string | null;
  replyMessage: string;
  appUrl?: string | null;
}) {
  const greetingName = params.adminName?.trim() || "Admin";
  const ticketLabel = params.ticketPublicId ?? params.ticketId ?? "Support Ticket";

  const subject = `Customer Replied — ${ticketLabel}`;
  const message = `A customer has replied to support ticket ${ticketLabel} and it may need admin attention.`;

  const text = [
    `Hello ${greetingName},`,
    "",
    message,
    "",
    `Ticket: ${ticketLabel}`,
    `Customer: ${params.customerName ?? "Guest / Not provided"}`,
    `Email: ${params.customerEmail ?? "Not provided"}`,
    `Subject: ${params.subjectLine ?? "Support Ticket"}`,
    `Reply: ${params.replyMessage}`,
    params.appUrl ? `Open ticket: ${params.appUrl}/admin/inquiries` : null,
    "",
    "Commerciales Flores",
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderEmailLayout({
    preheader: message,
    heroEyebrow: "Admin Alert",
    heroTitle: "A customer replied to a ticket",
    heroSubtitle:
      "There is a new customer reply in an existing support conversation.",
    greeting: `Hello <strong>${escapeHtml(greetingName)}</strong>,`,
    intro:
      'A customer has replied to a support ticket in <strong style="color:#111827;">Commerciales Flores</strong>.',
    contentHtml: renderInfoCard({
      label: "Ticket details",
      tone: "blue",
      bodyHtml: `
        <div><strong style="color:#334155;">Ticket:</strong> ${escapeHtml(
          ticketLabel
        )}</div>
        <div><strong style="color:#334155;">Customer:</strong> ${escapeHtml(
          params.customerName ?? "Guest / Not provided"
        )}</div>
        <div><strong style="color:#334155;">Email:</strong> ${escapeHtml(
          params.customerEmail ?? "Not provided"
        )}</div>
        <div><strong style="color:#334155;">Subject:</strong> ${escapeHtml(
          params.subjectLine ?? "Support Ticket"
        )}</div>
      `,
    }),
    detailsHtml: renderInfoCard({
      label: "Customer reply",
      tone: "slate",
      bodyHtml: `<div style="white-space:pre-wrap;">${nl2br(params.replyMessage)}</div>`,
    }),
    ctaHtml: params.appUrl
      ? renderCtaCard({
          title: "Open ticket conversation",
          description:
            "Open the admin inquiries page to continue the conversation and respond.",
          buttonLabel: "Open Inquiries",
          buttonUrl: `${params.appUrl}/admin/inquiries`,
        })
      : undefined,
    footerNote: "This admin alert was sent by Commerciales Flores.",
    closingHtml:
      'Regards,<br /><strong style="color:#111827;">Commerciales Flores System</strong>',
  });

  return {
    subject,
    message,
    text,
    html,
  };
}