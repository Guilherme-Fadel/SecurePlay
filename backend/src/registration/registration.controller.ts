import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, Matches } from 'class-validator';
import { Public } from '../auth/public.decorator';
import { TrialRegisterDto } from './dto/trial-register.dto';
import { RegistrationService } from './registration.service';
import { IsSecurePassword } from '../common/validators/password.validator';

class ConfirmEmailDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  token: string;

  @IsSecurePassword()
  password: string;
}

class ResendEmailDto {
  @IsEmail()
  email: string;
}

@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Public()
  @Post('trial')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  startTrial(@Body() dto: TrialRegisterDto) {
    return this.registrationService.startTrial(dto);
  }

  @Public()
  @Post('confirm-email')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  confirm(@Body() dto: ConfirmEmailDto) {
    return this.registrationService.confirm(dto.token, dto.password);
  }

  @Public()
  @Post('resend')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  resend(@Body() dto: ResendEmailDto) {
    return this.registrationService.resend(dto.email);
  }
}
