import { Controller, Get, Param, ParseIntPipe, Request } from '@nestjs/common';
import { ChallengeService } from './challenge.service';

@Controller('challenges')
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @Get('daily')
  async getDailyChallenge(@Request() req: any) {
    return this.challengeService.getDailyChallenge(req.user.userId);
  }

  @Get(':id/questions')
  async getQuestions(@Param('id', ParseIntPipe) id: number) {
    return this.challengeService.getQuestions(id);
  }
}
