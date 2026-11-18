import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Role } from '../../auth/roles.enum';
import { UsuarioService } from '../../usuario/usuario.service';
import { NOTIFICATION_EVENTS } from '../notification-events';
import type {
  MfaAlteradoPayload,
  SenhaAlteradaPayload,
} from '../notification-events';
import { NotificationService } from '../notification.service';

const ALERTA = 'Se não foi você, avise a gestão da escola.';

const MENSAGEM_SENHA: Record<SenhaAlteradaPayload['origem'], string> = {
  perfil: 'Você trocou a senha pelo seu perfil.',
  recuperacao: 'A senha foi redefinida pelo link de recuperação.',
  gestao: 'A gestão da escola redefiniu a sua senha.',
};

/**
 * Trata senha alterada e MFA alterado. Cada evento vira um registro próprio (sem
 * groupKey). Falhas só vão para o log, sem dados pessoais, para nunca derrubar a
 * ação de origem.
 */
@Injectable()
export class SegurancaNotificationListener {
  private readonly logger = new Logger(SegurancaNotificationListener.name);

  constructor(
    readonly notifications: NotificationService,
    private readonly usuarios: UsuarioService,
  ) {}

  @OnEvent(NOTIFICATION_EVENTS.senhaAlterada, { suppressErrors: false })
  async aoAlterarSenha(payload: SenhaAlteradaPayload): Promise<void> {
    const mensagem = MENSAGEM_SENHA[payload.origem];
    if (!mensagem) return;
    await this.avisar(payload.usuarioId, 'Sua senha foi alterada', mensagem);
  }

  @OnEvent(NOTIFICATION_EVENTS.mfaAlterado, { suppressErrors: false })
  async aoAlterarMfa(payload: MfaAlteradoPayload): Promise<void> {
    await this.avisar(
      payload.usuarioId,
      payload.ativado
        ? 'Verificação em duas etapas ativada'
        : 'Verificação em duas etapas desativada',
      payload.ativado
        ? 'A verificação em duas etapas foi ativada na sua conta.'
        : 'A verificação em duas etapas foi desativada na sua conta.',
    );
  }

  private async avisar(
    usuarioId: number,
    title: string,
    mensagem: string,
  ): Promise<void> {
    try {
      const usuario = await this.usuarios.getUsuarioById(usuarioId);
      if (!usuario?.active) return;
      // /perfil é rota do aluno; o console não tem página de conta, então a gestão fica sem link.
      const link = usuario.role === Role.USER ? '/perfil' : null;
      await this.notifications.notify([
        {
          usuarioId,
          type: 'seguranca',
          title,
          message: `${mensagem} ${ALERTA}`,
          link,
        },
      ]);
    } catch {
      this.logger.warn('Falha ao gerar notificação de segurança');
    }
  }
}
