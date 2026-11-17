import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { EmailService } from './email.service';
import { RegistrationService } from './registration.service';
import { TrialRegisterDto } from './dto/trial-register.dto';
import { getLocalDateKey } from '../common/utils/date.utils';
import {
  emailBudgetLimit,
  PublicEmailBudget,
  runWithPublicEmailGate,
} from './public-email-budget';

const PUBLIC_EMAIL_BUDGET_TTL_SECONDS = 2 * 24 * 60 * 60;

export const PUBLIC_REGISTRATION_RESPONSE = {
  sucesso: true,
  mensagem:
    'Se este endereço puder continuar o cadastro, enviaremos instruções por e-mail. Se já possui acesso, entre na sua conta.',
};

export const PUBLIC_PASSWORD_RESET_RESPONSE = {
  sucesso: true,
  mensagem:
    'Se houver uma conta com este e-mail, enviaremos um link para criar uma nova senha.',
};

@Injectable()
export class PublicRegistrationService implements OnApplicationShutdown {
  private readonly logger = new Logger(PublicRegistrationService.name);
  private readonly background = new Set<Promise<void>>();
  constructor(
    private readonly registration: RegistrationService,
    private readonly email: EmailService,
    private readonly redis: RedisService,
  ) {}

  async startTrial(dto: TrialRegisterDto) {
    return this.acknowledge('cadastro', () =>
      this.registration.startTrial(dto, (address) =>
        this.existingAccountGuidance(address),
      ),
    );
  }

  resend(address: string) {
    return this.acknowledgeInBackground(
      'recuperacao',
      () => this.registration.resend(address),
      PUBLIC_REGISTRATION_RESPONSE,
    );
  }

  forgotPassword(address: string) {
    return this.acknowledgeInBackground(
      'recuperacao',
      () => this.registration.requestPasswordReset(address),
      PUBLIC_PASSWORD_RESET_RESPONSE,
    );
  }

  /** Aguarda os envios em segundo plano (testes e encerramento da aplicação). */
  async settled(): Promise<void> {
    await Promise.allSettled([...this.background]);
  }

  async onApplicationShutdown() {
    await this.settled();
  }

  /**
   * Responde na hora e conclui o envio em segundo plano: o tempo de resposta não revela se
   * havia conta, convite pendente ou nada para o endereço.
   */
  private acknowledgeInBackground(
    budget: PublicEmailBudget,
    action: () => Promise<unknown>,
    response: { sucesso: boolean; mensagem: string },
  ) {
    const task: Promise<void> = this.withEmailBudget(budget, action)
      .then(() => undefined)
      .catch((error: unknown) => {
        const name = error instanceof Error ? error.name : 'erro';
        this.logger.warn(
          `Envio público em segundo plano falhou (${name}); resposta pública preservada.`,
        );
      })
      .finally(() => this.background.delete(task));
    this.background.add(task);
    return { ...response };
  }

  private async acknowledge(
    budget: PublicEmailBudget,
    action: () => Promise<unknown>,
    response = PUBLIC_REGISTRATION_RESPONSE,
  ) {
    try {
      await this.withEmailBudget(budget, action);
    } catch (error: unknown) {
      if (!(error instanceof ServiceUnavailableException)) throw error;
      // Falha de entrega não pode revelar qual ramo de conta foi encontrado.
      this.logger.warn(
        'Entrega de instruções de cadastro indisponível; resposta pública preservada.',
      );
    }
    return { ...response };
  }

  /** Cada e-mail enviado dentro do fluxo consome o orçamento diário do seu tipo de fluxo. */
  private withEmailBudget<T>(
    budget: PublicEmailBudget,
    action: () => Promise<T>,
  ): Promise<T> {
    return runWithPublicEmailGate(
      () => this.consumeEmailBudget(budget),
      action,
    );
  }

  private async consumeEmailBudget(
    budget: PublicEmailBudget,
  ): Promise<boolean> {
    try {
      const used = await this.redis.incrBy(
        `public-email:budget:${budget}:${getLocalDateKey()}`,
        1,
        PUBLIC_EMAIL_BUDGET_TTL_SECONDS,
      );
      return used <= emailBudgetLimit(budget);
    } catch {
      // Sem Redis o orçamento não é medido; os cooldowns por destinatário continuam valendo.
      this.logger.warn('Orçamento de e-mails públicos indisponível (Redis).');
      return true;
    }
  }

  private async existingAccountGuidance(address: string) {
    const key =
      'registration:guidance:' +
      createHash('sha256').update(address.trim().toLowerCase()).digest('hex');
    const owner = randomUUID();
    let acquired = false;
    try {
      acquired = await this.redis.acquireLease(key, owner, 10 * 60_000);
      if (!acquired) return;
      await this.email.sendAccessGuidance(address.trim(), owner);
    } catch {
      // Redis indisponível falha fechado para envio, sem expor endereço/token.
      this.logger.warn(
        'Orientação de acesso indisponível; resposta pública preservada.',
      );
      if (acquired) {
        await this.redis.releaseLease(key, owner).catch(() => {
          this.logger.warn(
            'Não foi possível liberar a espera de orientação de acesso.',
          );
        });
      }
    }
  }
}
