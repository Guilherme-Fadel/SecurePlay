import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { empresaProviders } from '../empresa/empresa.providers';
import { usuarioProviders } from '../usuario/usuario.providers';
import { DatabaseModule } from '../database/database.molule';
import { S3Service } from '../conteudo/s3/s3.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminController],
  providers: [
    ...empresaProviders,
    ...usuarioProviders,
    AdminService,
    S3Service,
  ],
  exports: [AdminService, ...empresaProviders],
})
export class AdminModule {}
