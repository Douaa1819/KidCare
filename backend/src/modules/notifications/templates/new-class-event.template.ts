import {
  escapeHtml,
  wrapEmailLayout,
  emailHeading,
  emailParagraph,
} from './email-layout';

export function buildNewClassEventEmail(params: {
  titre: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  classeNom: string;
}): { subject: string; html: string; text: string } {
  const { titre, description, startAt, endAt, classeNom } = params;
  const subject = `Nouvel événement — ${titre}`;

  const fmt = (d: Date) =>
    d.toLocaleString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const descBlock = description
    ? emailParagraph(
        `<strong>Détails :</strong><br/>${escapeHtml(description).replace(/\n/g, '<br/>')}`,
      )
    : '';

  const inner = `
    ${emailHeading('Nouvel événement')}
    ${emailParagraph('Bonjour,')}
    ${emailParagraph(
      `Un nouvel événement a été publié pour la classe <strong>${escapeHtml(classeNom)}</strong> :`,
    )}
    ${emailParagraph(`<strong>${escapeHtml(titre)}</strong>`)}
    ${descBlock}
    ${emailParagraph(
      `<strong>Début :</strong> ${escapeHtml(fmt(startAt))}<br/>
      <strong>Fin :</strong> ${escapeHtml(fmt(endAt))}`,
    )}
  `;

  const text = [
    'Nouvel événement',
    '',
    `Classe : ${classeNom}`,
    `Titre : ${titre}`,
    description ? `Détails : ${description}` : '',
    `Début : ${fmt(startAt)}`,
    `Fin : ${fmt(endAt)}`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject,
    html: wrapEmailLayout(subject, inner),
    text,
  };
}
