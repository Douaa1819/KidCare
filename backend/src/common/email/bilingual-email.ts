import {
  emailHeading,
  emailInfoBox,
  emailNoticeBox,
  emailParagraph,
  emailTag,
  escapeHtml,
  wrapKidCareEmail,
  type EmailCta,
} from './kidcare-email-layout';

/** Subject line: French | Arabic */
export function bilingualEmailSubject(fr: string, ar: string): string {
  return `${fr} | ${ar}`;
}

function localeDivider(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 20px;">
  <tr><td style="border-top:2px solid #e5e7eb;padding-top:20px;">
    <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;">العربية</p>
  </td></tr>
</table>`;
}

/**
 * Wrap bilingual email body: French section first, then Arabic (RTL).
 */
export function wrapBilingualEmail(params: {
  titleFr: string;
  titleAr: string;
  innerFr: string;
  innerAr: string;
  cta?: EmailCta;
  ctaAr?: EmailCta;
}): string {
  const inner = `
    <p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;">Français</p>
    ${params.innerFr}
    ${localeDivider()}
    <div dir="rtl" style="text-align:right;">
      ${params.innerAr}
    </div>
  `;

  return wrapKidCareEmail({
    title: params.titleFr,
    subtitle: params.titleAr,
    innerHtml: inner,
    locale: 'fr',
    cta: params.cta,
  });
}

export { emailHeading, emailInfoBox, emailNoticeBox, emailParagraph, emailTag, escapeHtml };
