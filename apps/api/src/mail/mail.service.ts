import { Inject, Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { ENV, type Env } from '../config/env.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends transactional emails. With MAIL_TRANSPORT=log (development, tests) the message is only
 * written to the logs, so flows can be exercised without a mail server.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.transporter =
      env.MAIL_TRANSPORT === 'smtp' && env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null;
  }

  /** True when emails are not really sent — the API may then echo codes for testing. */
  get isLoggingOnly(): boolean {
    return this.transporter === null;
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`Email to ${message.to} — ${message.subject}\n${message.text}`);
      return;
    }
    await this.transporter.sendMail({ from: this.env.MAIL_FROM, ...message });
  }
}
