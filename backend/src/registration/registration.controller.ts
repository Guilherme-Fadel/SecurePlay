import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, Matches } from 'class-validator';
import { Public } from '../auth/public.decorator';
import { TrialRegisterDto } from './dto/trial-register.dto';
import { RegistrationService } from './registration.service';
import { PublicRegistrationService } from './public-registration.service';
import { IsSecurePassword } from '../common/validators/password.validator';
import { RegistrationUsernameDto } from './dto/registration-contact.dto';

class ConfirmEmailDto extends RegistrationUsernameDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  token: string;
}

class SetPasswordDto {
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

class ResetStudentPasswordDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  token: string;

  @IsSecurePassword()
  password: string;
}

@Controller('registration')
export class RegistrationController {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly publicRegistration: PublicRegistrationService,
  ) {}

  @Public()
  @Post('trial')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  startTrial(@Body() dto: TrialRegisterDto) {
    return this.publicRegistration.startTrial(dto);
  }

  @Public()
  @Post('confirm-email')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  confirm(@Body() dto: ConfirmEmailDto) {
    return this.registrationService.confirm(dto.token, dto.username);
  }

  @Public()
  @Post('set-password')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  setPassword(@Body() dto: SetPasswordDto) {
    return this.registrationService.setPassword(dto.token, dto.password);
  }

  @Public()
  @Post('resend')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  resend(@Body() dto: ResendEmailDto) {
    return this.publicRegistration.resend(dto.email);
  }

  @Public()
  @Post('student-password-reset')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  resetStudentPassword(@Body() dto: ResetStudentPasswordDto) {
    return this.registrationService.resetSchoolStudentPassword(
      dto.token,
      dto.password,
    );
  }
}
