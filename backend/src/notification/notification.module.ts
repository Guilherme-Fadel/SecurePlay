import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { notificationProviders } from './notification.providers';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { AuthModule } from 'src/auth/auth.module';
import { UsuarioModule } from 'src/usuario/usuario.module';
import { RedisModule } from '../redis/redis.module';
import { NotificationScheduler } from './notification-scheduler';
import { NotificationJobs } from './notification-jobs';
import { AlunoNotificationListener } from './listeners/aluno.listener';
import { GestaoNotificationListener } from './listeners/gestao.listener';
import { SegurancaNotificationListener } from './listeners/seguranca.listener';

@Module({
  imports: [DatabaseModule, AuthModule, UsuarioModule, RedisModule],
  controllers: [NotificationController],
  providers: [
    ...notificationProviders,
    NotificationService,
    NotificationJobs,
    NotificationScheduler,
    AlunoNotificationListener,
    GestaoNotificationListener,
    SegurancaNotificationListener,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
