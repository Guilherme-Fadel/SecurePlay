import { Controller, Get, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.dashboardService.getStats(req.user.userId);
  }

  @Get('daily-challenge')
  async getDailyChallenge(@Request() req: any) {
    return this.dashboardService.getDailyChallenge(req.user.userId);
  }
}
