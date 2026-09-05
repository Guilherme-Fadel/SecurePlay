import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ArcadeService } from './arcade.service';
import {
  StartRunParamsDto,
  SubmitRunDto,
  TermoWordParamsDto,
} from './dto/arcade.dto';
import { TermoDictionaryService } from './termotech-dictionary.service';

@Controller('arcade')
export class ArcadeController {
  constructor(
    private readonly arcadeService: ArcadeService,
    private readonly termoDictionaryService: TermoDictionaryService,
  ) {}

  @Get('games')
  listGames() {
    return this.arcadeService.listGames();
  }

  @Get('tokens')
  getTokens(@Request() req: any) {
    return this.arcadeService.getTokens(req.user.userId);
  }

  @Get('termotech/words/:word')
  @Throttle({ short: { limit: 30, ttl: 60000 } })
  validateTermoWord(@Param() params: TermoWordParamsDto) {
    return this.termoDictionaryService.validate(params.word);
  }

  @Post('games/:slug/start')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  start(@Param() params: StartRunParamsDto, @Request() req: any) {
    return this.arcadeService.start(req.user.userId, params.slug);
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
