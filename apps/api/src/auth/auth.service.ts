import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  type AuthResponse,
  type CodeSentResponse,
  type EmailStatusResponse,
  type Me,
} from '@7trip/shared';
import { apiError } from '../common/api-error.js';
import { EmailCodePurpose } from '../generated/prisma/enums.js';
import { Prisma, type User } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toMe } from '../users/to-me.js';
import { EmailCodesService } from './email-codes.service.js';
import { PasswordService } from './password.service.js';
import { TokensService } from './tokens.service.js';

const INVALID_CODE_MESSAGE = 'Code incorrect ou expiré';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokensService,
    private readonly codes: EmailCodesService,
    private readonly mail: MailService,
  ) {}

  async emailStatus(email: string): Promise<EmailStatusResponse> {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    return { exists: user !== null };
  }

  async register(input: { email: string; password: string; displayName: string }): Promise<AuthResponse> {
    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          passwordHash: await this.passwords.hash(input.password),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw apiError(HttpStatus.CONFLICT, ApiErrorCode.EmailTaken, 'Un compte existe déjà avec cet email');
      }
      throw error;
    }
    const devEmailCode = await this.sendVerificationCode(user);
    return { ...(await this.tokens.issue(user.id)), user: toMe(user), ...devEmailCode };
  }

  async login(input: { email: string; password: string }): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const valid = await this.passwords.verify(user?.passwordHash, input.password);
    if (!user || !valid) {
      throw apiError(HttpStatus.UNAUTHORIZED, ApiErrorCode.InvalidCredentials, 'Email ou mot de passe incorrect');
    }
    return { ...(await this.tokens.issue(user.id)), user: toMe(user) };
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const { userId, tokens } = await this.tokens.rotate(refreshToken);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { ...tokens, user: toMe(user) };
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokens.revoke(refreshToken);
  }

  async resendVerification(userId: string): Promise<CodeSentResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerifiedAt) return {};
    return this.sendVerificationCode(user);
  }

  async verifyEmail(userId: string, code: string): Promise<Me> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerifiedAt) return toMe(user);

    if (!(await this.codes.consume(userId, EmailCodePurpose.VERIFY_EMAIL, code))) {
      throw apiError(HttpStatus.BAD_REQUEST, ApiErrorCode.InvalidCode, INVALID_CODE_MESSAGE);
    }
    const verified = await this.prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    return toMe(verified);
  }

  /** Always answers the same way, whether the account exists or not. */
  async forgotPassword(email: string): Promise<CodeSentResponse> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return {};

    const code = await this.codes.issue(user.id, EmailCodePurpose.RESET_PASSWORD);
    await this.mail.send({
      to: user.email,
      subject: `${code} — réinitialise ton mot de passe 7Trip`,
      text:
        `Bonjour ${user.displayName},\n\n` +
        `Voici ton code pour choisir un nouveau mot de passe : ${code}\n` +
        `Il est valable 15 minutes. Si tu n’as rien demandé, ignore cet email.\n\n— 7Trip`,
    });
    return this.devCode(code);
  }

  /** Sets the new password, signs out every other session and signs this one in. */
  async resetPassword(input: { email: string; code: string; password: string }): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await this.codes.consume(user.id, EmailCodePurpose.RESET_PASSWORD, input.code))) {
      throw apiError(HttpStatus.BAD_REQUEST, ApiErrorCode.InvalidCode, INVALID_CODE_MESSAGE);
    }
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      // Receiving the code proves ownership of the address.
      data: { passwordHash: await this.passwords.hash(input.password), emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
    });
    await this.tokens.revokeAll(user.id);
    return { ...(await this.tokens.issue(user.id)), user: toMe(updated) };
  }

  private async sendVerificationCode(user: User): Promise<CodeSentResponse> {
    const code = await this.codes.issue(user.id, EmailCodePurpose.VERIFY_EMAIL);
    await this.mail.send({
      to: user.email,
      subject: `${code} — confirme ton email 7Trip`,
      text:
        `Bienvenue ${user.displayName} !\n\n` +
        `Voici ton code de confirmation : ${code}\n` +
        `Il est valable 15 minutes.\n\n— 7Trip`,
    });
    return this.devCode(code);
  }

  private devCode(code: string): CodeSentResponse {
    return this.mail.isLoggingOnly ? { devEmailCode: code } : {};
  }
}
