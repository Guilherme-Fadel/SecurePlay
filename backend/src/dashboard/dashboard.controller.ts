import { Controller, Get, Post, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.dashboardService.getStats(req.user.userId);
  }

  @Get('streak')
  async getStreak(@Request() req: any) {
    return this.dashboardService.getWeeklyStreak(req.user.userId);
  }

  @Post('checkin')
  async checkin(@Request() req: any) {
    return this.dashboardService.performCheckin(req.user.userId);
  }
}
