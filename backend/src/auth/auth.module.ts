import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { UsuarioModule } from '../entities/usuarios/usuario.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    RedisModule,
    UsuarioModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      global: true,
      secret: config.get<string>('JWT_SECRET'),
      signOptions: { expiresIn: '2h' },
    }),
  }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard],
})

export class AuthModule {}