import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendVerification(to: string, token: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    const siteUrl = process.env.PUBLIC_SITE_URL?.trim();
    if (!apiKey || !from || !siteUrl) {
      throw new ServiceUnavailableException('Envio de e-mail indisponível');
    }
    const url = new URL('/confirmar-email', siteUrl);
    url.hash = token;
    const link = url.toString();
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          'Idempotency-Key':
            'verify-' + createHash('sha256').update(token).digest('hex'),
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: 'Confirme seu e-mail na SecurePlay',
          text:
            'Confirme seu e-mail para ativar seu acesso: ' +
            link +
            '\nO link expira em até 24 horas.',
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw await this.responseError(response);
    } catch (error) {
      this.logger.warn(
        error instanceof Error ? error.message : 'Falha no envio de e-mail',
      );
      throw new ServiceUnavailableException(
        'Não foi possível enviar o e-mail de confirmação',
      );
    }
  }

  private async responseError(response: Response): Promise<Error> {
    const body = (await response.json().catch(() => null)) as {
      message?: unknown;
      error?: unknown;
    } | null;
    const reason =
      typeof body?.message === 'string'
        ? body.message
        : typeof body?.error === 'string'
          ? body.error
          : 'motivo não informado';
    const safeReason = reason
      .replace(/\bre_[A-Za-z0-9_-]+\b/g, '[chave ocultada]')
      .replace(/https?:\/\/\S+/g, '[link ocultado]')
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[e-mail ocultado]')
      .slice(0, 400);
    return new Error(`Resend ${response.status}: ${safeReason}`);
  }
}
