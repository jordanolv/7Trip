import { z } from 'zod';

/** Emails are compared case-insensitively: always store and look them up normalised. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Indique ton adresse email')
  .pipe(z.email('Adresse email invalide'))
  .transform(normalizeEmail);

export const PASSWORD_MIN_LENGTH = 8;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Au moins ${PASSWORD_MIN_LENGTH} caractères`)
  .max(128, '128 caractères maximum');

export const DISPLAY_NAME_MAX_LENGTH = 40;
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Indique ton prénom ou un pseudo')
  .max(DISPLAY_NAME_MAX_LENGTH, `${DISPLAY_NAME_MAX_LENGTH} caractères maximum`);

/** One-time codes sent by email (verification, password reset). */
export const EMAIL_CODE_LENGTH = 6;
export const emailCodeSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`), `Le code contient ${EMAIL_CODE_LENGTH} chiffres`);

export const emailStatusRequestSchema = z.object({ email: emailSchema });
export type EmailStatusRequest = z.input<typeof emailStatusRequestSchema>;
export interface EmailStatusResponse {
  exists: boolean;
}

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});
export type RegisterRequest = z.input<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Indique ton mot de passe'),
});
export type LoginRequest = z.input<typeof loginRequestSchema>;

export const refreshRequestSchema = z.object({ refreshToken: z.string().min(1) });
export type RefreshRequest = z.input<typeof refreshRequestSchema>;

export const verifyEmailRequestSchema = z.object({ code: emailCodeSchema });
export type VerifyEmailRequest = z.input<typeof verifyEmailRequestSchema>;

export const forgotPasswordRequestSchema = z.object({ email: emailSchema });
export type ForgotPasswordRequest = z.input<typeof forgotPasswordRequestSchema>;

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
  code: emailCodeSchema,
  password: passwordSchema,
});
export type ResetPasswordRequest = z.input<typeof resetPasswordRequestSchema>;

export const updateMeRequestSchema = z.object({ displayName: displayNameSchema });
export type UpdateMeRequest = z.input<typeof updateMeRequestSchema>;

export interface Me {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  /** Opaque, single use: every refresh returns a new one. */
  refreshToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  user: Me;
  /**
   * Only in development when emails are logged instead of sent: the code that was "emailed",
   * so the flow can be tested on a phone without a mail server.
   */
  devEmailCode?: string;
}

/** Response of endpoints that send a code (resend verification, forgot password). */
export interface CodeSentResponse {
  devEmailCode?: string;
}

/** Stable error codes returned by the API in `{ code, message }` bodies. */
export const ApiErrorCode = {
  ValidationFailed: 'VALIDATION_FAILED',
  EmailTaken: 'EMAIL_TAKEN',
  InvalidCredentials: 'INVALID_CREDENTIALS',
  InvalidCode: 'INVALID_CODE',
  InvalidRefreshToken: 'INVALID_REFRESH_TOKEN',
  Unauthorized: 'UNAUTHORIZED',
  EmailNotVerified: 'EMAIL_NOT_VERIFIED',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  TooManyRequests: 'TOO_MANY_REQUESTS',
  LastOrganizer: 'LAST_ORGANIZER',
  InvitationInvalid: 'INVITATION_INVALID',
  /** Someone else changed the item since it was loaded: reload it before editing again. */
  EditConflict: 'EDIT_CONFLICT',
  /** The idea already has its event on the planning. */
  IdeaAlreadyPlanned: 'IDEA_ALREADY_PLANNED',
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  /** Field errors for VALIDATION_FAILED, keyed by field name. */
  fields?: Record<string, string>;
}
