import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ArcadeService } from './arcade.service';
import { SubmitRunDto } from './dto/arcade.dto';

@Controller('arcade')
export class ArcadeController {
  constructor(private readonly arcadeService: ArcadeService) {}

  @Get('games')
  listGames() {
    return this.arcadeService.listGames();
  }

  @Get('tokens')
  getTokens(@Request() req: any) {
    return this.arcadeService.getTokens(req.user.userId);
  }

  @Post('games/:slug/start')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  start(@Param('slug') slug: string, @Request() req: any) {
    return this.arcadeService.start(req.user.userId, slug);
  }

  @Post('runs/:runId/submit')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  submit(
    @Param('runId') runId: string,
    @Body() dto: SubmitRunDto,
    @Request() req: any,
  ) {
    return this.arcadeService.submit(req.user.userId, runId, dto);
  }
}
