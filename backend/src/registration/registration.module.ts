import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { EmailService } from './email.service';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { PublicRegistrationService } from './public-registration.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [EmailService, RegistrationService, PublicRegistrationService],
  controllers: [RegistrationController],
  exports: [RegistrationService, EmailService],
})
export class RegistrationModule {}
