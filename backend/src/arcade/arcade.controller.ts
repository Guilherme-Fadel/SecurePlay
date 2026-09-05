import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ArcadeService } from './arcade.service';
import { StartRunParamsDto, SubmitRunDto } from './dto/arcade.dto';

interface AuthenticatedRequest {
  user: {
    userId: number;
  };
}

@Controller('arcade')
export class ArcadeController {
  constructor(private readonly arcadeService: ArcadeService) {}

  @Get('games')
  listGames() {
    return this.arcadeService.listGames();
  }

  @Get('tokens')
  getTokens(@Request() req: AuthenticatedRequest) {
    return this.arcadeService.getTokens(req.user.userId);
  }

  @Post('games/:slug/start')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  start(
    @Param() params: StartRunParamsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.arcadeService.start(req.user.userId, params.slug);
  }

  @Post('runs/:runId/submit')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  submit(
    @Param('runId') runId: string,
    @Body() dto: SubmitRunDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.arcadeService.submit(req.user.userId, runId, dto);
  }
}
