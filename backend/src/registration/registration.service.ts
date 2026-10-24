import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager } from 'typeorm';
import { Convite } from '../admin/entities/convite.entity';
import { CompleteCadastroConviteDto } from '../admin/dto/complete-cadastro-convite.dto';
import { Role } from '../auth/roles.enum';
import { Empresa } from '../empresa/empresa.entity';
import { Usuario } from '../usuario/usuario.entity';
import { getLocalDateKey } from '../common/utils/date.utils';
import { TrialRegisterDto } from './dto/trial-register.dto';
import { EmailService } from './email.service';
import { PendingRegistration } from './pending-registration.entity';
import { ensurePendingRankingSeasonsClosed } from '../dashboard/ranking-history';
import {
  normalizePhone,
  normalizeUsername,
  registrationConflict,
  usernameTaken,
} from '../usuario/login-identity';

const CONFIRMATION_HOURS = 24;
const TRIAL_DAYS = 7;
const TRIAL_COMPANY_NAME = 'SecurePlay Teste Gratuito';
const TRIAL_COMPANY_KEY = 'free_trial';
const RESEND_COOLDOWN_MS = 60_000;
type RegistrationContext = {
  kind: 'trial' | 'invite';
  inviteId: number | null;
  invitedEmail: string | null;
  inviteExpiresAt: Date | null;
  inviteRole: Role | null;
  schoolStudent?: boolean;
};

@Injectable()
export class RegistrationService {
  constructor(
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
  ) {}

  async startTrial(dto: TrialRegisterDto) {
    return this.createPending(dto, {
      kind: 'trial',
      inviteId: null,
      invitedEmail: null,
      inviteExpiresAt: null,
      inviteRole: null,
    });
  }

  async startInvite(inviteToken: string, dto: CompleteCadastroConviteDto) {
    const invite = await this.dataSource.getRepository(Convite).findOne({
      where: { token_hash: this.hash(inviteToken) },
    });
    if (!invite || !this.inviteAvailable(invite)) {
      throw new ForbiddenException(
        'Convite inválido, expirado ou já utilizado',
      );
    }
    if (invite.registration_mode === 'school_student') {
      if (dto.email) {
        if (invite.role !== Role.USER || invite.email || invite.max_uses !== 1)
          throw new ForbiddenException('Convite escolar inválido');
        if (dto.password || dto.birth_date)
          throw new BadRequestException(
            'Confirme seu e-mail para definir a senha. Este convite não solicita data de nascimento.',
          );
        return this.createPending(dto, {
          kind: 'invite',
          inviteId: invite.id,
          invitedEmail: null,
          inviteExpiresAt: invite.expires_at,
          inviteRole: Role.USER,
          schoolStudent: true,
        });
      }
      return this.completeSchoolStudentInvite(inviteToken, dto);
    }
    if (!dto.email || !dto.birth_date || dto.password) {
      throw new BadRequestException(
        'Este convite exige e-mail, data de nascimento e confirmação por e-mail',
      );
    }
    return this.createPending(dto, {
      kind: 'invite',
      inviteId: invite.id,
      invitedEmail: invite.email,
      inviteExpiresAt: invite.expires_at,
      inviteRole: invite.role,
    });
  }

  private async completeSchoolStudentInvite(
    inviteToken: string,
    dto: CompleteCadastroConviteDto,
  ) {
    if (!dto.password) {
      throw new BadRequestException('Defina uma senha para criar sua conta');
    }
    if (dto.email || dto.birth_date) {
      throw new BadRequestException(
        'Este convite não solicita e-mail nem data de nascimento',
      );
    }
    if (dto.name.trim().length < 3 || dto.name.trim().length > 100) {
      throw new BadRequestException('Informe um nome de exibição válido');
    }

    const username = normalizeUsername(dto.username);
    const phone = normalizePhone(dto.phone);
    if (!username)
      throw new BadRequestException(
        'Escolha um usuário para entrar sem e-mail',
      );
    await ensurePendingRankingSeasonsClosed(this.dataSource);
    return this.dataSource
      .transaction(async (manager) => {
        const invite = await manager
          .getRepository(Convite)
          .createQueryBuilder('invite')
          .setLock('pessimistic_write')
          .where('invite.token_hash = :hash', { hash: this.hash(inviteToken) })
          .getOne();
        if (
          !invite ||
          invite.registration_mode !== 'school_student' ||
          invite.role !== Role.USER ||
          invite.email ||
          invite.max_uses !== 1 ||
          !this.inviteAvailable(invite)
        ) {
          throw new ForbiddenException(
            'Convite inválido, expirado ou já utilizado',
          );
        }

        const users = manager.getRepository(Usuario);
        if (await users.findOne({ where: { username } })) throw usernameTaken();

        const nickname = dto.nickname?.trim().replace(/\s+/g, ' ') || null;
        const user = users.create({
          name: dto.name.trim().replace(/\s+/g, ' '),
          email: null,
          username,
          phone,
          login_code: null,
          password: await bcrypt.hash(dto.password!, 10),
          birth_date: null,
          email_verified_at: null,
          password_change_required: false,
          empresa_id: invite.empresa_id,
          role: Role.USER,
          nickname_pending: nickname,
          nickname_request_status: nickname ? 'pending' : 'none',
          nickname_onboarding_pending: !nickname,
        });
        await users.save(user);
        invite.uses += 1;
        await manager.getRepository(Convite).save(invite);

        return {
          sucesso: true,
          mensagem: 'Conta criada. Use seu usuário e senha para entrar.',
          username,
        };
      })
      .catch(registrationConflict);
  }

  private async createPending(
    dto: TrialRegisterDto | CompleteCadastroConviteDto,
    context: RegistrationContext,
  ) {
    const email = dto.email!.trim().toLowerCase();
    const birthDate = context.schoolStudent
      ? null
      : this.validBirthDate(dto.birth_date!);
    const username = normalizeUsername(dto.username);
    const phone = normalizePhone(dto.phone);
    if (context.invitedEmail && email !== context.invitedEmail) {
      throw new ForbiddenException(
        'Use o e-mail para o qual este convite foi criado',
      );
    }
    if (
      context.inviteRole === Role.ADMIN &&
      'nickname' in dto &&
      dto.nickname
    ) {
      throw new BadRequestException('Administradores não utilizam apelidos');
    }
    if (
      await this.dataSource.getRepository(Usuario).findOne({ where: { email } })
    ) {
      throw new BadRequestException(
        'Este e-mail já possui um acesso cadastrado',
      );
    }
    const token = randomBytes(32).toString('base64url');
    const pendingRepository =
      this.dataSource.getRepository(PendingRegistration);
    const previous = await pendingRepository.findOne({ where: { email } });
    if (previous && previous.expires_at > new Date()) {
      return {
        sucesso: true,
        mensagem: 'Confira seu e-mail para confirmar o cadastro.',
      };
    }
    const pending = previous ?? pendingRepository.create();
    pending.token_hash = this.hash(token);
    pending.email = email;
    pending.name = dto.name.trim();
    pending.birth_date = birthDate;
    pending.username = username;
    pending.phone = phone;
    pending.nickname =
      context.inviteRole !== Role.ADMIN && 'nickname' in dto
        ? dto.nickname?.trim().replace(/\s+/g, ' ') || null
        : null;
    pending.kind = context.kind;
    pending.invite_id = context.inviteId;
    pending.expires_at = new Date(
      Math.min(
        Date.now() + CONFIRMATION_HOURS * 60 * 60 * 1000,
        context.inviteExpiresAt?.getTime() ?? Infinity,
      ),
    );
    pending.last_sent_at = new Date();
    await pendingRepository.save(pending).catch(registrationConflict);
    await this.emailService.sendVerification(email, token);
    return {
      sucesso: true,
      mensagem: 'Enviamos um link de confirmação para seu e-mail.',
    };
  }

  async resend(emailInput: string) {
    const email = emailInput.trim().toLowerCase();
    const repository = this.dataSource.getRepository(PendingRegistration);
    const pending = await repository.findOne({ where: { email } });
    if (!pending) {
      const user = await this.dataSource
        .getRepository(Usuario)
        .findOne({ where: { email } });
      if (
        user?.role === Role.PLATFORM_ADMIN &&
        user.email_verification_required &&
        !user.email_verified_at
      ) {
        await this.startPlatformAdminVerification(user);
      } else if (user?.password_change_required && user.email_verified_at) {
        await this.startPasswordSetup(user);
      }
      return {
        sucesso: true,
        mensagem: 'Se houver um cadastro pendente, enviaremos um novo link.',
      };
    }
    if (
      pending.last_sent_at &&
      Date.now() - new Date(pending.last_sent_at).getTime() < RESEND_COOLDOWN_MS
    ) {
      return {
        sucesso: true,
        mensagem: 'Aguarde um minuto antes de pedir outro link.',
      };
    }
    let inviteExpiresAt: Date | null = null;
    if (pending.kind === 'invite') {
      const invite = await this.dataSource
        .getRepository(Convite)
        .findOne({ where: { id: pending.invite_id! } });
      if (!invite || !this.inviteAvailable(invite)) {
        return {
          sucesso: true,
          mensagem: 'Convite indisponível. Solicite um novo à sua organização.',
        };
      }
      inviteExpiresAt = invite.expires_at;
    }
    const token = randomBytes(32).toString('base64url');
    pending.token_hash = this.hash(token);
    pending.expires_at = new Date(
      Math.min(
        Date.now() + CONFIRMATION_HOURS * 60 * 60 * 1000,
        inviteExpiresAt?.getTime() ?? Infinity,
      ),
    );
    pending.last_sent_at = new Date();
    await repository.save(pending);
    await this.emailService.sendVerification(email, token);
    return {
      sucesso: true,
      mensagem: 'Se houver um cadastro pendente, enviaremos um novo link.',
    };
  }

  async confirm(token: string, alternativeUsername?: string) {
    await ensurePendingRankingSeasonsClosed(this.dataSource);
    return this.dataSource
      .transaction(async (manager) => {
        const pending = await manager
          .getRepository(PendingRegistration)
          .createQueryBuilder('registration')
          .setLock('pessimistic_write')
          .where('registration.token_hash = :hash', { hash: this.hash(token) })
          .getOne();
        if (!pending || pending.expires_at <= new Date()) {
          const existing = await this.confirmExistingPasswordSetup(
            token,
            manager,
          );
          if (existing) return existing;
          return this.confirmPlatformAdmin(token, manager);
        }
        if (
          await manager
            .getRepository(Usuario)
            .findOne({ where: { email: pending.email } })
        ) {
          throw new BadRequestException(
            'Este e-mail já possui um acesso cadastrado',
          );
        }
        const username = normalizeUsername(
          alternativeUsername ?? pending.username,
        );
        if (
          username &&
          (await manager
            .getRepository(Usuario)
            .findOne({ where: { username } }))
        )
          throw usernameTaken();
        let companyId: number;
        let role = Role.USER;
        if (pending.kind === 'invite') {
          const invite = await manager
            .getRepository(Convite)
            .createQueryBuilder('invite')
            .setLock('pessimistic_write')
            .where('invite.id = :id', { id: pending.invite_id })
            .getOne();
          if (
            !invite ||
            !this.inviteAvailable(invite) ||
            (invite.registration_mode === 'school_student' &&
              (invite.role !== Role.USER ||
                invite.email ||
                invite.max_uses !== 1)) ||
            (invite.email && invite.email !== pending.email)
          ) {
            throw new ForbiddenException(
              'Este convite não está mais disponível',
            );
          }
          companyId = invite.empresa_id;
          role = invite.role === Role.ADMIN ? Role.ADMIN : Role.USER;
          invite.uses += 1;
          await manager.getRepository(Convite).save(invite);
        } else {
          companyId = await this.trialCompanyId(manager);
        }
        const now = new Date();
        const passwordSetupToken = randomBytes(32).toString('base64url');
        const user = manager.getRepository(Usuario).create({
          name: pending.name,
          email: pending.email,
          username,
          phone: pending.phone ?? null,
          password: await bcrypt.hash(
            randomBytes(32).toString('base64url'),
            10,
          ),
          birth_date: pending.birth_date,
          email_verified_at: now,
          password_change_required: true,
          password_setup_token_hash: this.hash(passwordSetupToken),
          password_setup_expires_at: new Date(
            now.getTime() + CONFIRMATION_HOURS * 60 * 60 * 1000,
          ),
          trial_started_at: pending.kind === 'trial' ? now : null,
          trial_ends_at:
            pending.kind === 'trial'
              ? new Date(now.getTime() + TRIAL_DAYS * 86400000)
              : null,
          empresa_id: companyId,
          role,
          nickname_pending: role === Role.USER ? pending.nickname : null,
          nickname_request_status:
            role === Role.USER && pending.nickname ? 'pending' : 'none',
          nickname_onboarding_pending: role === Role.USER && !pending.nickname,
        });
        await manager.getRepository(Usuario).save(user);
        await manager.getRepository(PendingRegistration).remove(pending);
        return {
          sucesso: true,
          mensagem: 'E-mail confirmado. Defina sua senha para ativar o acesso.',
          password_setup_token: passwordSetupToken,
        };
      })
      .catch(registrationConflict);
  }

  async setPassword(token: string, password: string) {
    const tokenHash = this.hash(token);
    return this.dataSource.transaction(async (manager) => {
      const user = await manager
        .getRepository(Usuario)
        .createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.password_setup_token_hash = :tokenHash', { tokenHash })
        .getOne();
      if (
        !user ||
        !user.password_change_required ||
        !user.password_setup_expires_at ||
        user.password_setup_expires_at <= new Date()
      ) {
        throw new NotFoundException(
          'Link para definir senha inválido ou expirado',
        );
      }

      user.password = await bcrypt.hash(password, 10);
      user.password_change_required = false;
      user.password_setup_token_hash = null;
      user.password_setup_expires_at = null;
      user.password_setup_last_sent_at = null;
      await manager.getRepository(Usuario).save(user);
      return { sucesso: true, mensagem: 'Senha definida com sucesso.' };
    });
  }

  async resetSchoolStudentPassword(token: string, password: string) {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager
        .getRepository(Usuario)
        .createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.password_reset_token_hash = :tokenHash', {
          tokenHash: this.hash(token),
        })
        .getOne();
      if (
        !user ||
        !user.active ||
        user.role !== Role.USER ||
        user.email !== null ||
        !(user.username || user.login_code) ||
        !user.password_reset_expires_at ||
        user.password_reset_expires_at <= new Date()
      ) {
        throw new NotFoundException('Link de recuperação inválido ou expirado');
      }

      user.password = await bcrypt.hash(password, 10);
      user.password_reset_token_hash = null;
      user.password_reset_expires_at = null;
      user.password_change_required = false;
      user.session_version = (user.session_version ?? 0) + 1;
      await manager.getRepository(Usuario).save(user);
      return {
        sucesso: true,
        mensagem:
          'Senha atualizada. Use seu usuário ou código de acesso para entrar.',
        username: user.username ?? null,
        login_code: user.login_code,
      };
    });
  }

  async startPlatformAdminVerification(user: Usuario) {
    if (!user.email) {
      throw new BadRequestException(
        'Conta administrativa sem e-mail cadastrado',
      );
    }
    const issue = await this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .getRepository(Usuario)
        .createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.id = :id', { id: user.id })
        .getOne();
      if (
        !locked?.active ||
        locked.role !== Role.PLATFORM_ADMIN ||
        !locked.email_verification_required ||
        locked.email_verified_at
      ) {
        return null;
      }
      const previous = {
        email_verification_token_hash: locked.email_verification_token_hash,
        email_verification_expires_at: locked.email_verification_expires_at,
      };
      const issuedAt = locked.email_verification_expires_at
        ? new Date(locked.email_verification_expires_at).getTime() -
          CONFIRMATION_HOURS * 60 * 60 * 1000
        : 0;
      if (
        locked.email_verification_token_hash &&
        Date.now() - issuedAt < RESEND_COOLDOWN_MS
      ) {
        return null;
      }
      const token = randomBytes(32).toString('base64url');
      locked.email_verification_token_hash = this.hash(token);
      locked.email_verification_expires_at = new Date(
        Date.now() + CONFIRMATION_HOURS * 60 * 60 * 1000,
      );
      await manager.getRepository(Usuario).save(locked);
      return {
        token,
        tokenHash: locked.email_verification_token_hash,
        previous,
      };
    });
    if (!issue) return;
    try {
      await this.emailService.sendVerification(user.email, issue.token);
    } catch (error) {
      await this.dataSource
        .getRepository(Usuario)
        .createQueryBuilder()
        .update(Usuario)
        .set(issue.previous)
        .where('id = :id AND email_verification_token_hash = :tokenHash', {
          id: user.id,
          tokenHash: issue.tokenHash,
        })
        .execute();
      throw error;
    }
  }

  private async startPasswordSetup(user: Usuario) {
    if (!user.email) return;
    const issue = await this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .getRepository(Usuario)
        .createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.id = :id', { id: user.id })
        .getOne();
      if (
        !locked?.active ||
        !locked.password_change_required ||
        !locked.email_verified_at
      ) {
        return null;
      }
      if (
        locked.password_setup_last_sent_at &&
        Date.now() - new Date(locked.password_setup_last_sent_at).getTime() <
          RESEND_COOLDOWN_MS
      ) {
        return null;
      }
      const previous = {
        password_setup_token_hash: locked.password_setup_token_hash,
        password_setup_expires_at: locked.password_setup_expires_at,
        password_setup_last_sent_at: locked.password_setup_last_sent_at,
      };
      const token = randomBytes(32).toString('base64url');
      locked.password_setup_token_hash = this.hash(token);
      locked.password_setup_expires_at = new Date(
        Date.now() + CONFIRMATION_HOURS * 60 * 60 * 1000,
      );
      locked.password_setup_last_sent_at = new Date();
      await manager.getRepository(Usuario).save(locked);
      return { token, tokenHash: locked.password_setup_token_hash, previous };
    });
    if (!issue) return;
    try {
      await this.emailService.sendPasswordSetup(user.email, issue.token);
    } catch (error) {
      await this.dataSource
        .getRepository(Usuario)
        .createQueryBuilder()
        .update(Usuario)
        .set(issue.previous)
        .where('id = :id AND password_setup_token_hash = :tokenHash', {
          id: user.id,
          tokenHash: issue.tokenHash,
        })
        .execute();
      throw error;
    }
  }

  private async confirmExistingPasswordSetup(
    token: string,
    manager: EntityManager,
  ) {
    const user = await manager
      .getRepository(Usuario)
      .createQueryBuilder('user')
      .setLock('pessimistic_write')
      .where('user.password_setup_token_hash = :tokenHash', {
        tokenHash: this.hash(token),
      })
      .getOne();
    if (!user) return null;
    if (
      !user.email_verified_at ||
      !user.password_change_required ||
      !user.password_setup_expires_at ||
      user.password_setup_expires_at <= new Date()
    ) {
      throw new NotFoundException(
        'Link para definir senha inválido ou expirado',
      );
    }
    const passwordSetupToken = randomBytes(32).toString('base64url');
    user.password_setup_token_hash = this.hash(passwordSetupToken);
    user.password_setup_expires_at = new Date(
      Date.now() + CONFIRMATION_HOURS * 60 * 60 * 1000,
    );
    await manager.getRepository(Usuario).save(user);
    return {
      sucesso: true,
      mensagem: 'E-mail confirmado. Defina sua senha para ativar o acesso.',
      password_setup_token: passwordSetupToken,
    };
  }

  private async confirmPlatformAdmin(token: string, manager: EntityManager) {
    const now = new Date();
    const user = await manager.getRepository(Usuario).findOne({
      where: { email_verification_token_hash: this.hash(token) },
    });
    if (
      !user ||
      user.role !== Role.PLATFORM_ADMIN ||
      !user.email_verification_required ||
      !user.email_verification_expires_at ||
      user.email_verification_expires_at <= now
    ) {
      throw new NotFoundException('Link de confirmação inválido ou expirado');
    }

    const passwordSetupToken = randomBytes(32).toString('base64url');
    user.email_verified_at = now;
    user.email_verification_token_hash = null;
    user.email_verification_expires_at = null;
    user.password_change_required = true;
    user.password_setup_token_hash = this.hash(passwordSetupToken);
    user.password_setup_expires_at = new Date(
      now.getTime() + CONFIRMATION_HOURS * 60 * 60 * 1000,
    );
    await manager.getRepository(Usuario).save(user);
    return {
      sucesso: true,
      mensagem: 'E-mail confirmado. Altere sua senha para ativar o acesso.',
      password_setup_token: passwordSetupToken,
    };
  }

  private async trialCompanyId(manager: EntityManager): Promise<number> {
    const repository = manager.getRepository(Empresa);
    let company = await repository.findOne({
      where: { system_key: TRIAL_COMPANY_KEY },
    });
    if (!company) {
      company = await repository.save(
        repository.create({
          nome: TRIAL_COMPANY_NAME,
          system_key: TRIAL_COMPANY_KEY,
          parametros_funcionalidades: {
            rankingEnabled: true,
            globalRankingEnabled: false,
            achievementsEnabled: true,
            enabledGames: [
              'quiz-relampago',
              'caca-phishing',
              'classificacao-dados',
              'termotech',
            ],
          },
        }),
      );
    }
    return company.id;
  }

  private inviteAvailable(invite: Convite) {
    return (
      !invite.revoked &&
      invite.uses < invite.max_uses &&
      invite.expires_at > new Date()
    );
  }

  private validBirthDate(value: string): string {
    const date = new Date(value + 'T00:00:00Z');
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value ||
      value > getLocalDateKey()
    ) {
      throw new BadRequestException('Data de nascimento inválida');
    }
    return value;
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
