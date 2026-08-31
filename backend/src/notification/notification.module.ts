import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { notificationProviders } from './notification.providers';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { AuthModule } from 'src/auth/auth.module';
import { UsuarioModule } from 'src/usuario/usuario.module';

@Module({
  imports: [DatabaseModule, AuthModule, UsuarioModule],
  controllers: [NotificationController],
  providers: [...notificationProviders, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
