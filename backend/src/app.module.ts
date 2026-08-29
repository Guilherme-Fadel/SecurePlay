import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsuarioModule } from './usuario/usuario.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { BenefitsModule } from './benefits/benefits.module';
import { NotificationModule } from './notification/notification.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ChallengeModule } from './challenge/challenge.module';
import { ConteudoModule } from './conteudo/conteudo.module';
import { ArcadeModule } from './arcade/arcade.module';
import { SeedModule } from './seed/seed.module';
import { AdminModule } from './admin/admin.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { RedisModule } from './redis/redis.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppGateway } from './gateway/app.gateway';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AchievementsModule } from './achievements/achievements.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 200,
      },
    ]),
    RedisModule,
    AuthModule,
    UsuarioModule,
    BenefitsModule,
    NotificationModule,
    ChallengeModule,
    ConteudoModule,
    DashboardModule,
    ArcadeModule,
    SeedModule,
    AdminModule,
    AchievementsModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppGateway,
  ],
})
export class AppModule {}
