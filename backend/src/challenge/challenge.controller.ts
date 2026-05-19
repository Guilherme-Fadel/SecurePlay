import { Controller, Get, Request } from '@nestjs/common';
import { ChallengeService } from './challenge.service';

@Controller('challenges')
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @Get('daily')
  async getDailyChallenge(@Request() req: any) {
    return this.challengeService.getDailyChallenge(req.user.userId);
  }
}
