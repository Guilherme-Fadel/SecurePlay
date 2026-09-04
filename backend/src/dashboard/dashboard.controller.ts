import { Controller, Get, Query, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('ranking')
  async getRanking(
    @Request() req: any,
    @Query('scope') scope?: 'global' | 'company',
  ) {
    return this.dashboardService.getRanking(
      req.user.userId,
      scope === 'company' ? 'company' : 'global',
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
