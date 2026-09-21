import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { EmailService } from './email.service';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';

@Module({
  imports: [DatabaseModule],
  providers: [EmailService, RegistrationService],
  controllers: [RegistrationController],
  exports: [RegistrationService],
})
export class RegistrationModule {}
