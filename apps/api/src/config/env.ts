import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3100),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    /** `log` prints emails to the console instead of sending them (development). */
    MAIL_TRANSPORT: z.enum(['log', 'smtp']).default('log'),
    SMTP_URL: z.string().optional(),
    MAIL_FROM: z.string().default('7Trip <no-reply@7trip.fr>'),

    /**
     * Express "trust proxy": which peers may set X-Forwarded-For. `loopback` on a single host;
     * `loopback, uniquelocal` in Docker, where Traefik and the guest web reach the API over the
     * private network.
     */
    TRUST_PROXY: z.string().default('loopback'),

    /**
     * Daily exchange rates. `ecb`: the European Central Bank's, through Frankfurter (no key).
     * `fixed`: a small fixed table, for tests that must not depend on the network.
     */
    RATES_SOURCE: z.enum(['ecb', 'fixed']).default('ecb'),

    /** Requests allowed per minute and per IP on sensitive auth routes. */
    AUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),
  })
  .refine((env) => env.MAIL_TRANSPORT !== 'smtp' || !!env.SMTP_URL, {
    message: 'SMTP_URL is required when MAIL_TRANSPORT=smtp',
    path: ['SMTP_URL'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.MAIL_TRANSPORT === 'smtp', {
    message: 'Emails must really be sent in production (MAIL_TRANSPORT=smtp)',
    path: ['MAIL_TRANSPORT'],
  });

export type Env = z.infer<typeof envSchema>;

/** Validates the environment once at startup so a misconfiguration fails fast and loudly. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** Injection token for the validated environment. */
export const ENV = Symbol('ENV');
