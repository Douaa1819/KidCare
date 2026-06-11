import { deepSanitizeJsonBody } from './deep-sanitize';

describe('deepSanitizeJsonBody (PoC XSS / HTML)', () => {
  it('supprime les balises script tout en gardant le texte sûr', () => {
    const out = deepSanitizeJsonBody({
      observations: '<script>alert(1)</script>Bonjour',
    }) as { observations: string };
    expect(out.observations).not.toMatch(/<script/i);
    expect(out.observations).toContain('Bonjour');
  });

  it('ne modifie pas les champs mot de passe', () => {
    const out = deepSanitizeJsonBody({
      email: 'a@b.c',
      password: '<secret>And1',
    }) as { email: string; password: string };
    expect(out.password).toBe('<secret>And1');
    expect(out.email).toBe('a@b.c');
  });

  it('laisse passer nombres et booléens', () => {
    const out = deepSanitizeJsonBody({ n: 42, ok: true, x: null }) as {
      n: number;
      ok: boolean;
      x: null;
    };
    expect(out.n).toBe(42);
    expect(out.ok).toBe(true);
    expect(out.x).toBeNull();
  });

  it('sanitize récursif dans tableaux', () => {
    const out = deepSanitizeJsonBody({ tags: ['<b>x</b>', 'ok'] }) as {
      tags: string[];
    };
    expect(out.tags[0]).not.toMatch(/<b>/);
    expect(out.tags[1]).toBe('ok');
  });
});
