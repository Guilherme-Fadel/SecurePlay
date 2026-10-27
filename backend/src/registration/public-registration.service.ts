import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { EmailService } from './email.service';
import { RegistrationService } from './registration.service';
import { TrialRegisterDto } from './dto/trial-register.dto';

export const PUBLIC_REGISTRATION_RESPONSE = {
  sucesso: true,
  mensagem:
    'Se este endereço puder continuar o cadastro, enviaremos instruções por e-mail. Se já possui acesso, entre na sua conta.',
};

@Injectable()
export class PublicRegistrationService {
  private readonly logger = new Logger(PublicRegistrationService.name);
  constructor(
    private readonly registration: RegistrationService,
    private readonly email: EmailService,
    private readonly redis: RedisService,
  ) {}

  async startTrial(dto: TrialRegisterDto) {
    return this.acknowledge(() =>
      this.registration.startTrial(dto, (address) =>
        this.existingAccountGuidance(address),
      ),
    );
  }

  async resend(address: string) {
    return this.acknowledge(() => this.registration.resend(address));
  }

  private async acknowledge(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (error: unknown) {
      if (!(error instanceof ServiceUnavailableException)) throw error;
      // Falha de entrega não pode revelar qual ramo de conta foi encontrado.
      this.logger.warn(
        'Entrega de instruções de cadastro indisponível; resposta pública preservada.',
      );
    }
    return { ...PUBLIC_REGISTRATION_RESPONSE };
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
