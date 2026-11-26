import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Request,
} from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { CosmeticType } from './entities/cosmetic-item.entity';
import { CharacterColorDto } from './dto/character-color.dto';
import { EquipCosmeticDto } from './dto/equip-cosmetic.dto';
import { RequiresFeature } from '../common/features/feature.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller('achievements')
@RequiresFeature('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  getTrail(@Request() req: any) {
    return this.achievementsService.getTrail(req.user.userId);
  }

  @Get('recent')
  getRecent(@Request() req: any) {
    return this.achievementsService.getRecent(req.user.userId, 3);
  }

  @Get('shop')
  getShop(@Request() req: any) {
    return this.achievementsService.getShop(req.user.userId);
  }

  // Compra e equipar são do aluno (inclui trial/free tier, que seguem `user`):
  // gestão nunca compra nem equipa, e a carteira não pode nascer por aqui.
  @Roles(Role.USER)
  @Post('shop/:id/purchase')
  purchase(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.achievementsService.purchase(req.user.userId, id);
  }

  @Roles(Role.USER)
  @Post('shop/kits/:id/purchase')
  purchaseKit(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.achievementsService.purchaseKit(req.user.userId, id);
  }

  @Roles(Role.USER)
  @Post('shop/:id/equip')
  equip(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EquipCosmeticDto,
  ) {
    return this.achievementsService.equip(req.user.userId, id, body.color);
  }

  @Roles(Role.USER)
  @Post('character/color')
  setCharacterColor(@Request() req: any, @Body() body: CharacterColorDto) {
    return this.achievementsService.setCharacterColor(
      req.user.userId,
      body.color,
    );
  }

  @Roles(Role.USER)
  @Post('shop/type/:type/unequip')
  unequip(
    @Request() req: any,
    @Param('type', new ParseEnumPipe(CosmeticType)) type: CosmeticType,
  ) {
    return this.achievementsService.unequip(req.user.userId, type);
  }
}
