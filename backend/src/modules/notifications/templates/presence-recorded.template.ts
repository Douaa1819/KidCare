import { StatutPresence } from '@prisma/client';
import {
  escapeHtml,
  wrapEmailLayout,
  emailHeading,
  emailParagraph,
  emailTag,
} from './email-layout';

function statutLabel(s: StatutPresence): string {
  switch (s) {
    case StatutPresence.Present:
      return 'Présent';
    case StatutPresence.Absent:
      return 'Absent';
    case StatutPresence.Justifie:
      return 'Absent justifié';
    default:
      return String(s);
  }
}

export function buildPresenceRecordedEmail(params: {
  enfantPrenom: string;
  enfantNom: string;
  dateYmd: string;
  statut: StatutPresence;
}): { subject: string; html: string; text: string } {
  const { enfantPrenom, enfantNom, dateYmd, statut } = params;
  const label = statutLabel(statut);
  const subject = `Présence du ${dateYmd} — ${enfantPrenom} ${enfantNom}`;

  const inner = `
    ${emailHeading('Présence enregistrée')}
    ${emailParagraph('Bonjour,')}
    ${emailParagraph(
      `La présence de <strong>${escapeHtml(enfantPrenom)} ${escapeHtml(enfantNom)}</strong> a été enregistrée pour le <strong>${escapeHtml(dateYmd)}</strong>.`,
    )}
    ${emailTag(label)}
    ${emailParagraph('Vous pouvez consulter le détail sur votre espace parent.')}
  `;

  const text = `Présence enregistrée\n\nEnfant : ${enfantPrenom} ${enfantNom}\nDate : ${dateYmd}\nStatut : ${label}\n`;

  return {
    subject,
    html: wrapEmailLayout(subject, inner),
    text,
  };
}
