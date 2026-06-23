import { Body, Controller, Get, Param, ParseIntPipe, Post, Request } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { SubmitChallengeDto } from './dto/challenge.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('challenges')
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @Get('daily')
  async getDailyChallenge(@Request() req: any) {
    return this.challengeService.getDailyChallenge(req.user.userId);
  }

  @Get(':id/status')
  async getStatus(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.challengeService.getStatus(id, req.user.userId);
  }

  @Get(':id/questions')
  async getQuestions(@Param('id', ParseIntPipe) id: number) {
    return this.challengeService.getQuestions(id);
  }

  @Post(':id/submit')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async submitChallenge(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitChallengeDto,
    @Request() req: any,
  ) {
    return this.challengeService.submitChallenge(id, req.user.userId, dto);
  }
}
