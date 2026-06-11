import type { IOptions } from 'sanitize-html';

/** Balises sûres pour contenus riches (règlement, descriptions, résumés). */
export function richTextSanitizerConfig(): IOptions {
  return {
    allowedTags: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'blockquote', 'a',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    },
  };
}

/** Champs texte long autorisant un HTML limité. */
export const RICH_TEXT_FIELD_KEYS = new Set([
  'contenu',
  'description',
  'activites',
  'apprentissages',
  'observations',
  'humeurGroupe',
  'resume',
  'message',
  'notes',
  'remarques',
  'titre',
]);
