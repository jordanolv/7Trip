import { emailCodeSchema, loginRequestSchema, registerRequestSchema } from './auth.js';

describe('auth schemas', () => {
  it('normalises emails so the same address cannot create two accounts', () => {
    const parsed = registerRequestSchema.parse({
      email: '  Jordan@Exemple.FR ',
      password: 'x'.repeat(8),
      displayName: ' Jordan ',
    });
    expect(parsed.email).toBe('jordan@exemple.fr');
    expect(parsed.displayName).toBe('Jordan');
  });

  it('rejects short passwords and invalid emails with French messages', () => {
    const result = registerRequestSchema.safeParse({ email: 'pas-un-email', password: 'x'.repeat(5), displayName: 'J' });
    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((i) => i.message);
    expect(messages).toContain('Adresse email invalide');
    expect(messages).toContain('Au moins 8 caractères');
  });

  it('does not apply password rules at login (old passwords keep working)', () => {
    expect(loginRequestSchema.safeParse({ email: 'a@b.fr', password: 'x' }).success).toBe(true);
  });

  it('accepts six-digit codes only', () => {
    expect(emailCodeSchema.safeParse(' 012345 ').success).toBe(true);
    expect(emailCodeSchema.safeParse('12345').success).toBe(false);
    expect(emailCodeSchema.safeParse('12345a').success).toBe(false);
  });
});
