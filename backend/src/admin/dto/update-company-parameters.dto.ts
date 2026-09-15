import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { COMPANY_GAME_SLUGS, CompanyGameSlug } from '../../config/features';

export class UpdateCompanyParametersDto {
  @IsBoolean()
  rankingEnabled: boolean;

  @IsBoolean()
  globalRankingEnabled: boolean;

  @IsBoolean()
  achievementsEnabled: boolean;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(COMPANY_GAME_SLUGS.length)
  @IsIn([...COMPANY_GAME_SLUGS], { each: true })
  enabledGames: CompanyGameSlug[];
}
