import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.molule';
import { notificationProviders } from './notification.providers';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { OwnershipGuard } from 'src/auth/ownership.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationController],
  providers: [
    ...notificationProviders,
    NotificationService,
    OwnershipGuard,
  ],
  exports: [NotificationService],
})

export class NotificationModule {}
   