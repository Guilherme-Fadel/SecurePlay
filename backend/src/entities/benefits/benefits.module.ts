import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.molule';
import { benefitsProviders } from './benefits.providers';
import { BenefitsService } from './benefits.service';
import { BenefitsController } from './benefits.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [BenefitsController],
  providers: [
    ...benefitsProviders,
    BenefitsService,
  ],
  exports: [BenefitsService],
})

export class BenefitsModule {}