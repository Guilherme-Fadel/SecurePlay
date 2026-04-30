import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.molule';
import { benefitsProviders } from './benefits.providers';
import { BenefitsService } from './benefits.service';
import { BenefitsController } from './benefits.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [BenefitsController],
  providers: [
    ...benefitsProviders,
    BenefitsService,
  ],
  exports: [BenefitsService],
})

export class BenefitsModule {}
   