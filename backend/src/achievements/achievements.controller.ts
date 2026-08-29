import { Controller, Get, Param, ParseEnumPipe, ParseIntPipe, Post, Request } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { CosmeticType } from './entities/cosmetic-item.entity';

@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  getTrail(@Request() req: any) {
    return this.achievementsService.getTrail(req.user.userId);
  }

  @Get('shop')
  getShop(@Request() req: any) {
    return this.achievementsService.getShop(req.user.userId);
  }

  @Post('shop/:id/purchase')
  purchase(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.achievementsService.purchase(req.user.userId, id);
  }

  @Post('shop/:id/equip')
  equip(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.achievementsService.equip(req.user.userId, id);
  }

  @Post('shop/type/:type/unequip')
  unequip(
    @Request() req: any,
    @Param('type', new ParseEnumPipe(CosmeticType)) type: CosmeticType,
  ) {
    return this.achievementsService.unequip(req.user.userId, type);
  }
}
