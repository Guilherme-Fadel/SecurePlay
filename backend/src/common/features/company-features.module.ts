import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.molule';
import { CompanyFeaturesService } from './company-features.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [CompanyFeaturesService],
  exports: [CompanyFeaturesService],
})
export class CompanyFeaturesModule {}
