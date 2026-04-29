import { Body, Controller, Get, Post, HttpCode, HttpStatus, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from 'src/entities/usuarios/dto/login.dto';
import { JwtAuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  signIn(@Body() dto: LoginDto) {
    return this.authService.signIn(dto);
  }

  @Get('token')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: any) {
    return {
      userId: req.user.userId,
      email: req.user.email,
    };
  }
}