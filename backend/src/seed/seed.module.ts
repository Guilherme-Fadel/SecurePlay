import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { SeedService } from './seed.service';
import { seedProviders } from './seed.providers';

@Module({
  imports: [DatabaseModule],
  providers: [...seedProviders, SeedService],
})
export class SeedModule {}
