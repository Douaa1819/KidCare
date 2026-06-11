import {
  escapeHtml,
  wrapEmailLayout,
  emailHeading,
  emailParagraph,
} from './email-layout';

export function buildDailyResumeRecordedEmail(params: {
  enfantPrenom: string;
  enfantNom: string;
  dateYmd: string;
}): { subject: string; html: string; text: string } {
  const { enfantPrenom, enfantNom, dateYmd } = params;
  const subject = `Résumé de journée du ${dateYmd} — ${enfantPrenom} ${enfantNom}`;

  const inner = `
    ${emailHeading('Résumé de journée disponible')}
    ${emailParagraph('Bonjour,')}
    ${emailParagraph(
      `L'enseignant a publié le résumé de journée de <strong>${escapeHtml(enfantPrenom)} ${escapeHtml(enfantNom)}</strong> pour le <strong>${escapeHtml(dateYmd)}</strong>.`,
    )}
    ${emailParagraph(
      'Connectez-vous à votre espace parent pour consulter le détail (appétit, humeur, sieste, participation et observations).',
    )}
  `;

  const text = `Résumé de journée disponible\n\nEnfant : ${enfantPrenom} ${enfantNom}\nDate : ${dateYmd}\n`;

  return {
    subject,
    html: wrapEmailLayout(subject, inner),
    text,
  };
}
