import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';

const ALLOW_EXPIRED_TRIAL = 'allow_expired_trial';
export const AllowExpiredTrial = () => SetMetadata(ALLOW_EXPIRED_TRIAL, true);

@Injectable()
export class TrialAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(ALLOW_EXPIRED_TRIAL, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { userId?: number } }>();
    const userId = request.user?.userId;
    if (!userId) return true;
    const user = await this.dataSource
      .getRepository(Usuario)
      .findOne({ where: { id: userId } });
    if (!user) throw new ForbiddenException('Conta indisponível');
    if (user.trial_ends_at && new Date(user.trial_ends_at) <= new Date()) {
      throw new ForbiddenException('Seu teste gratuito terminou');
    }
    return true;
  }
}
