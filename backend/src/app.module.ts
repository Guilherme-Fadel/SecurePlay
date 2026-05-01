import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsuarioModule } from './entities/usuarios/usuario.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { BenefitsModule } from './entities/benefits/benefits.module';
import { NotificationModule } from './entities/notification/notification.module';

@Module({
  imports: [
    AuthModule,
    UsuarioModule,
    BenefitsModule,
    NotificationModule,
    ConfigModule.forRoot({
      isGlobal: true,
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
