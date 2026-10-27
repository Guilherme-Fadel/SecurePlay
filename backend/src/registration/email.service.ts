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
    return this.sendLink(
      to,
      token,
      'Confirme seu e-mail na SecurePlay',
      'Confirme seu e-mail para ativar seu acesso: ',
    );
  }

  async sendPasswordSetup(to: string, token: string): Promise<void> {
    return this.sendLink(
      to,
      token,
      'Defina sua senha na SecurePlay',
      'Abra o link para definir sua senha e ativar seu acesso: ',
    );
  }

  async sendAccessGuidance(to: string, requestId: string): Promise<void> {
    const login = this.siteLink('/login').toString();
    const setup = this.siteLink('/verifique-email?mode=password').toString();
    return this.sendMessage(
      to,
      'Orientações de acesso à SecurePlay',
      'Recebemos uma solicitação de cadastro para este endereço. Se você já possui acesso, entre em ' +
        login +
        '\nSe ainda precisa confirmar seu endereço ou definir a senha inicial, peça instruções em ' +
        setup +
        '\nPara recuperar uma senha já definida, procure o responsável pelo seu acesso. Se não fez esta solicitação, ignore esta mensagem. Sua conta não foi alterada.',
      'access-guidance-' + requestId,
    );
  }

  private async sendLink(
    to: string,
    token: string,
    subject: string,
    introduction: string,
  ): Promise<void> {
    const url = this.siteLink('/confirmar-email');
    url.hash = token;
    const link = url.toString();
    return this.sendMessage(
      to,
      subject,
      introduction + link + '\nO link expira em até 24 horas.',
      'verify-' + createHash('sha256').update(token).digest('hex'),
    );
  }

  private siteLink(path: string): URL {
    try {
      const url = new URL(path, process.env.PUBLIC_SITE_URL?.trim());
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      return url;
    } catch {
      throw new ServiceUnavailableException('Envio de e-mail indisponível');
    }
  }

  private async sendMessage(
    to: string,
    subject: string,
    text: string,
    idempotencyKey: string,
  ): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    if (!apiKey || !from)
      throw new ServiceUnavailableException('Envio de e-mail indisponível');
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw await this.responseError(response);
    } catch (error) {
      this.logger.warn(
        error instanceof Error ? error.message : 'Falha no envio de e-mail',
      );
      throw new ServiceUnavailableException('Não foi possível enviar o e-mail');
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
