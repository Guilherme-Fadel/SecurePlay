import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { EmailContent, renderEmailHtml } from './email-layout';

type LinkEmailContent = Omit<
  EmailContent,
  'action' | 'note' | 'showFallbackLink'
> & {
  subject: string;
  introduction: string;
  actionLabel: string;
  path?: string;
  expiry?: string;
};

interface EmailMessage {
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendVerification(to: string, token: string): Promise<void> {
    return this.sendLink(to, token, {
      subject: 'Confirme seu e-mail na SecurePlay',
      introduction: 'Confirme seu e-mail para ativar seu acesso: ',
      preheader: 'Falta só um clique para ativar seu acesso à SecurePlay.',
      eyebrow: 'Confirmação de e-mail',
      title: 'Falta só um clique para começar a',
      highlight: 'aventura.',
      paragraphs: [
        'Recebemos seu cadastro na SecurePlay. Confirme que este endereço é seu para ativar seu acesso.',
      ],
      actionLabel: 'Confirmar meu e-mail',
      safety:
        'Não fez este cadastro? Ignore este e-mail: sem a confirmação, nenhum acesso é ativado.',
    });
  }

  async sendPasswordSetup(to: string, token: string): Promise<void> {
    return this.sendLink(to, token, {
      subject: 'Defina sua senha na SecurePlay',
      introduction: 'Abra o link para definir sua senha e ativar seu acesso: ',
      preheader: 'Crie sua senha para entrar na SecurePlay.',
      eyebrow: 'Ativação de acesso',
      title: 'Escolha sua senha e',
      highlight: 'dê o play.',
      paragraphs: [
        'Seu acesso à SecurePlay está quase pronto. Abra o link para definir sua senha e ativar sua conta.',
      ],
      actionLabel: 'Definir minha senha',
      safety:
        'Não esperava este e-mail? Ignore esta mensagem: sem definir a senha, nenhum acesso é ativado.',
    });
  }

  async sendPasswordReset(
    to: string,
    token: string,
    minutes: number,
  ): Promise<void> {
    return this.sendLink(to, token, {
      subject: 'Recupere sua senha na SecurePlay',
      introduction:
        'Recebemos um pedido para redefinir sua senha. Abra o link para criar uma nova: ',
      path: '/recuperar-acesso',
      expiry: `O link expira em ${minutes} minutos e só pode ser usado uma vez.`,
      preheader: `Use o link para criar uma nova senha. Ele vale por ${minutes} minutos.`,
      eyebrow: 'Recuperação de senha',
      title: 'Vamos criar uma nova senha e voltar ao',
      highlight: 'jogo.',
      paragraphs: [
        'Recebemos um pedido para redefinir a senha da sua conta na SecurePlay. Use o botão abaixo para criar uma nova.',
      ],
      actionLabel: 'Criar nova senha',
      safety:
        'Não pediu para trocar a senha? Ignore este e-mail: sua senha atual continua valendo.',
    });
  }

  async sendAccessGuidance(to: string, requestId: string): Promise<void> {
    const login = this.siteLink('/login').toString();
    const setup = this.siteLink('/verifique-email?mode=password').toString();
    const subject = 'Orientações de acesso à SecurePlay';
    return this.sendMessage(
      to,
      {
        subject,
        text:
          'Recebemos uma solicitação de cadastro para este endereço. Se você já possui acesso, entre em ' +
          login +
          '\nSe ainda precisa confirmar seu endereço ou definir a senha inicial, peça instruções em ' +
          setup +
          '\nPara recuperar uma senha já definida, use "Esqueci minha senha" na tela de entrada. Se não fez esta solicitação, ignore esta mensagem. Sua conta não foi alterada.',
        html: renderEmailHtml(
          subject,
          {
            preheader:
              'Recebemos uma solicitação de cadastro para este endereço.',
            eyebrow: 'Orientações de acesso',
            title: 'Recebemos um pedido de cadastro para',
            highlight: 'este e-mail.',
            paragraphs: [
              'Se você já possui acesso, é só entrar com seu e-mail e senha.',
              'Se ainda precisa confirmar seu endereço ou definir a senha inicial, peça novas instruções. Para recuperar uma senha já definida, use "Esqueci minha senha" na tela de entrada.',
            ],
            action: { label: 'Entrar na SecurePlay', url: login },
            secondary: { label: 'Pedir novas instruções', url: setup },
            safety:
              'Não fez esta solicitação? Ignore esta mensagem. Sua conta não foi alterada.',
          },
          this.brand(),
        ),
      },
      'access-guidance-' + requestId,
    );
  }

  private async sendLink(
    to: string,
    token: string,
    {
      subject,
      introduction,
      actionLabel,
      path = '/confirmar-email',
      expiry = 'O link expira em até 24 horas.',
      ...content
    }: LinkEmailContent,
  ): Promise<void> {
    const url = this.siteLink(path);
    url.hash = token;
    const link = url.toString();
    return this.sendMessage(
      to,
      {
        subject,
        text: introduction + link + '\n' + expiry,
        html: renderEmailHtml(
          subject,
          {
            ...content,
            action: { label: actionLabel, url: link },
            note: expiry,
            showFallbackLink: true,
          },
          this.brand(),
        ),
      },
      'verify-' + createHash('sha256').update(token).digest('hex'),
    );
  }

  private brand() {
    return {
      home: this.siteLink('/').toString(),
      logo: this.siteLink('/email/secureplay-logo-blue.png').toString(),
      logoDark: this.siteLink('/email/secureplay-logo-cream.png').toString(),
      symbol: this.siteLink('/email/secureplay-symbol-cream.png').toString(),
    };
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
    { subject, text, html }: EmailMessage,
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
          html,
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
