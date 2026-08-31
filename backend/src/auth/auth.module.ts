import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { UsuarioModule } from '../usuario/usuario.module';
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
        useFactory: (config: ConfigService) => {
          const secret = config.get<string>('JWT_SECRET')?.trim();
          if (!secret || secret.length < 32) {
            throw new Error(
              'JWT_SECRET deve estar definido e ter ao menos 32 caracteres',
            );
          }

          return {
            global: true,
            secret,
            signOptions: { expiresIn: '2h' },
          };
        },
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
