import { Controller, Get, Post, Query, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Throttle } from '@nestjs/throttler';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('ranking')
  async getRanking(@Request() req: any, @Query('scope') scope?: string) {
    return this.dashboardService.getRanking(
      req.user.userId,
      scope === 'company' ? 'company' : 'global',
    );
  }

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.dashboardService.getStats(req.user.userId);
  }

  @Get('streak')
  async getStreak(@Request() req: any) {
    return this.dashboardService.getWeeklyStreak(req.user.userId);
  }

  @Post('checkin')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  async checkin(@Request() req: any) {
    return this.dashboardService.performCheckin(req.user.userId);
  }
}
