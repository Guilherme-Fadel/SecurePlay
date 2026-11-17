import { Inject, Injectable } from '@nestjs/common';
import { IsNull, Repository } from 'typeorm';
import { Usuario } from '../../usuario/usuario.entity';

/** Conta com os campos de MFA que normalmente não saem do banco (`select: false`). */
export type MfaAccount = Usuario;

/** Acesso aos campos de MFA da conta. Leitura sempre com `addSelect` explícito. */
@Injectable()
export class MfaStore {
  constructor(
    @Inject('USUARIO_REPOSITORY')
    private readonly usuarios: Repository<Usuario>,
  ) {}

  async load(id: number): Promise<MfaAccount | null> {
    return this.usuarios
      .createQueryBuilder('u')
      .addSelect('u.mfa_secret_encrypted')
      .addSelect('u.mfa_recovery_codes')
      .where('u.id = :id', { id })
      .getOne();
  }

  /** Grava o segredo pendente; só vale enquanto o MFA não foi ativado. */
  async savePendingSecret(id: number, encrypted: string): Promise<boolean> {
    const result = await this.usuarios.update(
      { id, mfa_enabled_at: IsNull() },
      { mfa_secret_encrypted: encrypted },
    );
    return (result.affected ?? 0) > 0;
  }

  /** Ativa o MFA e grava os hashes dos códigos de recuperação. */
  async activate(id: number, recoveryHashes: string[]): Promise<boolean> {
    const result = await this.usuarios.update(
      { id, mfa_enabled_at: IsNull() },
      { mfa_enabled_at: new Date(), mfa_recovery_codes: recoveryHashes },
    );
    return (result.affected ?? 0) > 0;
  }

  /** Remove o código da lista de uma vez só; devolve `false` se ele não estava lá. */
  async consumeRecoveryCode(id: number, hash: string): Promise<boolean> {
    const found = "JSON_SEARCH(mfa_recovery_codes, 'one', :hash)";
    const result = await this.usuarios
      .createQueryBuilder()
      .update(Usuario)
      .set({
        mfa_recovery_codes: () =>
          `JSON_REMOVE(mfa_recovery_codes, JSON_UNQUOTE(${found}))`,
      })
      .where(`id = :id AND ${found} IS NOT NULL`, { id, hash })
      .execute();
    return (result.affected ?? 0) > 0;
  }
}
