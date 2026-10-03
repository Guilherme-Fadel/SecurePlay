import { BadRequestException, Controller, Get, Query, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { validateRankingSelection } from './ranking-history';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('ranking')
  async getRanking(
    @Request() req: any,
    @Query('scope') scope?: unknown,
    @Query('companyId') companyId?: unknown,
    @Query('mode') mode?: unknown,
    @Query('season') season?: unknown,
  ) {
    if (scope !== undefined && (typeof scope !== 'string' || (scope !== 'company' && scope !== 'global'))) {
      throw new BadRequestException('Escopo de ranking inválido');
    }
    let selection: ReturnType<typeof validateRankingSelection>;
    try { selection = validateRankingSelection(mode, season); }
    catch (error) { throw new BadRequestException((error as Error).message); }
    if (companyId !== undefined && (typeof companyId !== 'string' || !/^[1-9]\d*$/.test(companyId) || !Number.isSafeInteger(Number(companyId)))) {
      throw new BadRequestException('Empresa inválida');
    }
    return this.dashboardService.getRanking(
      req.user.userId,
      scope === 'company' ? 'company' : 'global',
      true,
      { companyId: companyId ? Number(companyId) : undefined, ...selection },
    );
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.dashboardService.getStats(req.user.userId);
  }

  @Get('journey')
  async getJourney(@Request() req: any) {
    return this.dashboardService.getJourney(req.user.userId);
  }

  @Get('streak')
  async getStreak(@Request() req: any) {
    return this.dashboardService.getWeeklyStreak(req.user.userId);
  }
}
