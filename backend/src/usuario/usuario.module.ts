import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.molule';
import { usuarioProviders } from './usuario.providers';
import { UsuarioService } from './usuario.service';
import { UsuarioController } from './usuario.controller';
import { S3Service } from '../conteudo/s3/s3.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UsuarioController],
  providers: [...usuarioProviders, UsuarioService, S3Service],
  exports: [UsuarioService],
})
export class UsuarioModule {}
