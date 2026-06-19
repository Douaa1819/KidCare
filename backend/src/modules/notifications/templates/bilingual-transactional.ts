import { StatutPresence } from '@prisma/client';
import {
  bilingualEmailSubject,
  emailHeading,
  emailParagraph,
  emailTag,
  escapeHtml,
  wrapBilingualEmail,
} from '../../../common/email/bilingual-email';

function presenceStatutFr(s: StatutPresence): string {
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

function presenceStatutAr(s: StatutPresence): string {
  switch (s) {
    case StatutPresence.Present:
      return 'حاضر';
    case StatutPresence.Absent:
      return 'غائب';
    case StatutPresence.Justifie:
      return 'غياب مبرر';
    default:
      return String(s);
  }
}

function formatDateTimeFr(d: Date): string {
  return d.toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTimeAr(d: Date): string {
  return d.toLocaleString('ar-MA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildPresenceRecordedEmail(params: {
  enfantPrenom: string;
  enfantNom: string;
  dateYmd: string;
  statut: StatutPresence;
}): { subject: string; html: string; text: string } {
  const { enfantPrenom, enfantNom, dateYmd, statut } = params;
  const labelFr = presenceStatutFr(statut);
  const labelAr = presenceStatutAr(statut);
  const name = `${enfantPrenom} ${enfantNom}`;

  const subject = bilingualEmailSubject(
    `Présence du ${dateYmd} — ${name}`,
    `الحضور بتاريخ ${dateYmd} — ${name}`,
  );

  const innerFr = `
    ${emailHeading('Présence enregistrée')}
    ${emailParagraph('Bonjour,')}
    ${emailParagraph(
      `La présence de <strong>${escapeHtml(enfantPrenom)} ${escapeHtml(enfantNom)}</strong> a été enregistrée pour le <strong>${escapeHtml(dateYmd)}</strong>.`,
    )}
    ${emailTag(labelFr)}
    ${emailParagraph('Consultez le détail sur votre espace parent.')}
  `;

  const innerAr = `
    ${emailHeading('تم تسجيل الحضور')}
    ${emailParagraph('مرحباً،')}
    ${emailParagraph(
      `تم تسجيل حضور <strong>${escapeHtml(enfantPrenom)} ${escapeHtml(enfantNom)}</strong> بتاريخ <strong>${escapeHtml(dateYmd)}</strong>.`,
    )}
    ${emailTag(labelAr)}
    ${emailParagraph('يمكنكم الاطلاع على التفاصيل من فضلكم الأبوي.')}
  `;

  const text = `Présence / الحضور\n${name}\n${dateYmd}\n${labelFr} / ${labelAr}`;

  return { subject, html: wrapBilingualEmail({ titleFr: 'Présence', titleAr: 'الحضور', innerFr, innerAr }), text };
}

export function buildDailyResumeRecordedEmail(params: {
  enfantPrenom: string;
  enfantNom: string;
  dateYmd: string;
}): { subject: string; html: string; text: string } {
  const { enfantPrenom, enfantNom, dateYmd } = params;
  const name = `${enfantPrenom} ${enfantNom}`;

  const subject = bilingualEmailSubject(
    `Résumé de journée du ${dateYmd} — ${name}`,
    `ملخص اليوم بتاريخ ${dateYmd} — ${name}`,
  );

  const innerFr = `
    ${emailHeading('Résumé de journée disponible')}
    ${emailParagraph('Bonjour,')}
    ${emailParagraph(
      `Le résumé de journée de <strong>${escapeHtml(enfantPrenom)} ${escapeHtml(enfantNom)}</strong> pour le <strong>${escapeHtml(dateYmd)}</strong> est disponible.`,
    )}
    ${emailParagraph('Connectez-vous à votre espace parent pour consulter le détail.')}
  `;

  const innerAr = `
    ${emailHeading('ملخص اليوم متاح')}
    ${emailParagraph('مرحباً،')}
    ${emailParagraph(
      `ملخص يوم <strong>${escapeHtml(enfantPrenom)} ${escapeHtml(enfantNom)}</strong> بتاريخ <strong>${escapeHtml(dateYmd)}</strong> متاح الآن.`,
    )}
    ${emailParagraph('سجّلوا الدخول إلى فضلكم الأبوي للاطلاع على التفاصيل.')}
  `;

  const text = `Résumé / ملخص\n${name}\n${dateYmd}`;

  return { subject, html: wrapBilingualEmail({ titleFr: 'Résumé de journée', titleAr: 'ملخص اليوم', innerFr, innerAr }), text };
}

export function buildNewClassEventEmail(params: {
  titre: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  classeNom: string;
}): { subject: string; html: string; text: string } {
  const { titre, description, startAt, endAt, classeNom } = params;

  const subject = bilingualEmailSubject(
    `Nouvel événement — ${titre}`,
    `حدث جديد — ${titre}`,
  );

  const descFr = description
    ? emailParagraph(`<strong>Détails :</strong><br/>${escapeHtml(description).replace(/\n/g, '<br/>')}`)
    : '';
  const descAr = description
    ? emailParagraph(`<strong>التفاصيل :</strong><br/>${escapeHtml(description).replace(/\n/g, '<br/>')}`)
    : '';

  const innerFr = `
    ${emailHeading('Nouvel événement')}
    ${emailParagraph('Bonjour,')}
    ${emailParagraph(`Un événement a été publié pour la classe <strong>${escapeHtml(classeNom)}</strong> :`)}
    ${emailParagraph(`<strong>${escapeHtml(titre)}</strong>`)}
    ${descFr}
    ${emailParagraph(`<strong>Début :</strong> ${escapeHtml(formatDateTimeFr(startAt))}<br/><strong>Fin :</strong> ${escapeHtml(formatDateTimeFr(endAt))}`)}
  `;

  const innerAr = `
    ${emailHeading('حدث جديد')}
    ${emailParagraph('مرحباً،')}
    ${emailParagraph(`تم نشر حدث للقسم <strong>${escapeHtml(classeNom)}</strong> :`)}
    ${emailParagraph(`<strong>${escapeHtml(titre)}</strong>`)}
    ${descAr}
    ${emailParagraph(`<strong>البداية :</strong> ${escapeHtml(formatDateTimeAr(startAt))}<br/><strong>النهاية :</strong> ${escapeHtml(formatDateTimeAr(endAt))}`)}
  `;

  const text = `Événement / حدث\n${classeNom}\n${titre}\n${formatDateTimeFr(startAt)}`;

  return { subject, html: wrapBilingualEmail({ titleFr: 'Événement', titleAr: 'حدث', innerFr, innerAr }), text };
}

export function buildClassEventCancelledEmail(params: {
  titre: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  classeNom: string;
}): { subject: string; html: string; text: string } {
  const { titre, description, startAt, endAt, classeNom } = params;

  const subject = bilingualEmailSubject(
    `Événement annulé — ${titre}`,
    `تم إلغاء الحدث — ${titre}`,
  );

  const descFr = description
    ? emailParagraph(`<strong>Détails :</strong><br/>${escapeHtml(description).replace(/\n/g, '<br/>')}`)
    : '';
  const descAr = description
    ? emailParagraph(`<strong>التفاصيل :</strong><br/>${escapeHtml(description).replace(/\n/g, '<br/>')}`)
    : '';

  const innerFr = `
    ${emailHeading('Événement annulé')}
    ${emailParagraph('Bonjour,')}
    ${emailParagraph(
      `Nous vous informons que l'événement suivant, prévu pour la classe <strong>${escapeHtml(classeNom)}</strong>, a été <strong>annulé</strong> par l'administration :`,
    )}
    ${emailParagraph(`<strong>${escapeHtml(titre)}</strong>`)}
    ${descFr}
    ${emailParagraph(`<strong>Date prévue :</strong> ${escapeHtml(formatDateTimeFr(startAt))}<br/><strong>Fin prévue :</strong> ${escapeHtml(formatDateTimeFr(endAt))}`)}
    ${emailParagraph('Nous vous prions de ne plus vous présenter pour cet événement.')}
  `;

  const innerAr = `
    ${emailHeading('تم إلغاء الحدث')}
    ${emailParagraph('مرحباً،')}
    ${emailParagraph(
      `نود إعلامكم بأن الحدث التالي، المقرر للقسم <strong>${escapeHtml(classeNom)}</strong>، قد <strong>أُلغي</strong> من طرف الإدارة :`,
    )}
    ${emailParagraph(`<strong>${escapeHtml(titre)}</strong>`)}
    ${descAr}
    ${emailParagraph(`<strong>التاريخ المقرر :</strong> ${escapeHtml(formatDateTimeAr(startAt))}<br/><strong>النهاية المقررة :</strong> ${escapeHtml(formatDateTimeAr(endAt))}`)}
    ${emailParagraph('يرجى عدم الحضور لهذا الحدث.')}
  `;

  const text = [
    'Événement annulé / تم إلغاء الحدث',
    classeNom,
    titre,
    formatDateTimeFr(startAt),
  ].join('\n');

  return {
    subject,
    html: wrapBilingualEmail({ titleFr: 'Événement annulé', titleAr: 'إلغاء حدث', innerFr, innerAr }),
    text,
  };
}
