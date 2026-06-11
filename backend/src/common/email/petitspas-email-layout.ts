/** Couleurs alignées sur le thème frontend PetitsPas */
export const PETITSPAS_THEME = {
  sky: '#AEDFF7',
  skyLight: '#E8F6FC',
  coral: '#FF6F61',
  coralHover: '#e45f54',
  cream: '#FFF7ED',
  text: '#1a1a1a',
  textSoft: '#4b5563',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  white: '#ffffff',
  pageBg: '#f4f9fc',
} as const;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type EmailCta = { href: string; label: string };

export type PetitspasEmailOptions = {
  /** Titre de la page / bandeau */
  title: string;
  /** Sous-titre sous le logo (optionnel) */
  subtitle?: string;
  /** Contenu HTML du corps (déjà échappé si besoin) */
  innerHtml: string;
  locale?: 'fr' | 'ar';
  cta?: EmailCta;
  footerNote?: string;
};

const FOOTER_FR =
  'Cet email a été envoyé automatiquement par PetitsPas. Merci de ne pas répondre directement à ce message.';
const FOOTER_AR = 'تم إرسال هذا البريد تلقائياً من PetitsPas. يُرجى عدم الرد مباشرة على هذه الرسالة.';

/**
 * Enveloppe HTML simple, compatible clients mail, thème PetitsPas.
 */
export function wrapPetitspasEmail(options: PetitspasEmailOptions): string {
  const { title, subtitle, innerHtml, cta } = options;
  const isAr = options.locale === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const lang = isAr ? 'ar' : 'fr';
  const footer = options.footerNote ?? (isAr ? FOOTER_AR : FOOTER_FR);
  const year = new Date().getFullYear();
  const t = PETITSPAS_THEME;

  const ctaBlock = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 8px;">
  <tr>
    <td align="center" style="border-radius:12px;background-color:${t.coral};">
      <a href="${escapeHtml(cta.href)}" target="_blank" rel="noopener"
        style="display:inline-block;padding:12px 28px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">
        ${escapeHtml(cta.label)}
      </a>
    </td>
  </tr>
</table>`
    : '';

  const subtitleBlock = subtitle
    ? `<p style="margin:6px 0 0;font-size:14px;color:${t.textSoft};font-weight:500;">${escapeHtml(subtitle)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${t.pageBg};font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${t.pageBg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${t.white};border-radius:16px;overflow:hidden;border:1px solid ${t.border};box-shadow:0 4px 24px rgba(174,223,247,0.35);">
          <tr>
            <td style="padding:28px 32px 24px;text-align:center;background:linear-gradient(135deg, ${t.sky} 0%, ${t.cream} 55%, ${t.white} 100%);border-bottom:1px solid ${t.border};">
              <p style="margin:0;font-size:26px;font-weight:700;color:${t.text};letter-spacing:-0.02em;">PetitsPas</p>
              ${subtitleBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 20px;color:${t.text};font-size:15px;line-height:1.65;">
              ${innerHtml}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid ${t.border};text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:${t.textMuted};line-height:1.5;">${footer}</p>
              <p style="margin:0;font-size:11px;color:#9ca3af;">© ${year} PetitsPas</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Alias pour les templates de notification existants */
export function wrapEmailLayout(title: string, innerHtml: string, locale?: 'fr' | 'ar'): string {
  return wrapPetitspasEmail({ title, innerHtml, locale });
}

/** Bloc identifiants (invitation) */
export function emailCredentialsBox(
  rows: { label: string; value: string }[],
): string {
  const t = PETITSPAS_THEME;
  const rowsHtml = rows
    .map(
      (r) => `<tr>
      <td style="padding:8px 0;font-size:14px;color:${t.textSoft};width:38%;vertical-align:top;">${escapeHtml(r.label)}</td>
      <td style="padding:8px 0;font-size:14px;color:${t.text};font-family:ui-monospace,Consolas,monospace;background-color:${t.skyLight};padding:6px 10px;border-radius:8px;">${escapeHtml(r.value)}</td>
    </tr>`,
    )
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:${t.skyLight};border-radius:12px;border-left:4px solid ${t.sky};">
  <tr><td style="padding:16px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
  </td></tr>
</table>`;
}

/** Encadré d’information */
export function emailInfoBox(contentHtml: string): string {
  const t = PETITSPAS_THEME;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:${t.cream};border-radius:12px;border:1px solid ${t.border};">
  <tr><td style="padding:14px 16px;font-size:14px;line-height:1.55;color:${t.text};">${contentHtml}</td></tr>
</table>`;
}

/** Note / conseil */
export function emailNoticeBox(text: string): string {
  const t = PETITSPAS_THEME;
  return `<p style="margin:16px 0 0;padding:12px 14px;font-size:13px;line-height:1.5;color:${t.textSoft};background-color:${t.cream};border-radius:10px;border:1px solid #fde68a;">${escapeHtml(text)}</p>`;
}

/** Titre de section dans le corps */
export function emailHeading(text: string): string {
  return `<h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:${PETITSPAS_THEME.text};line-height:1.3;">${escapeHtml(text)}</h2>`;
}

/** Badge / statut */
export function emailTag(label: string): string {
  const t = PETITSPAS_THEME;
  return `<span style="display:inline-block;margin:8px 0;padding:5px 12px;font-size:13px;font-weight:600;color:#1e4a5f;background-color:${t.sky};border-radius:999px;">${escapeHtml(label)}</span>`;
}

/** Paragraphe standard */
export function emailParagraph(html: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${PETITSPAS_THEME.text};">${html}</p>`;
}
