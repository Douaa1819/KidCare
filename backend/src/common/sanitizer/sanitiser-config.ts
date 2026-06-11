import type { IOptions } from 'sanitize-html';

/**
 * Configuration stricte : aucune balise HTML — texte uniquement, atténuation XSS.
 * Utiliser avec sanitize-html sur les chaînes issues du JSON utilisateur.
 */
export function sanitiserConfig(): IOptions {
  return {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  };
}
