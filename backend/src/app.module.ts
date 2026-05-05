import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsuarioModule } from './entities/usuarios/usuario.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { BenefitsModule } from './entities/benefits/benefits.module';
import { NotificationModule } from './entities/notification/notification.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/auth.guard';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    RedisModule,
    AuthModule,
    UsuarioModule,
    BenefitsModule,
    NotificationModule,
    ConfigModule.forRoot({
      isGlobal: true,
    })
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
