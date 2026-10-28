import { z } from 'zod';

// Form fields shared by ideas and planning events.

/** Optional text: blank means "none" (null). */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .transform((value) => value || null)
    .nullish();

/** A pasted link, with or without its scheme ("www.alcazarsevilla.org" works too). */
export const optionalUrl = z
  .string()
  .trim()
  .max(500, 'Lien trop long')
  .transform((value) => (value && !/^https?:\/\//i.test(value) ? `https://${value}` : value || null))
  .pipe(z.url({ protocol: /^https?$/, hostname: z.regexes.domain, message: 'Lien invalide' }).nullable())
  .nullish();
