import { IsIn, IsOptional, IsString } from 'class-validator';
import { COLLECTIBLE_STATUSES } from '../collectible-pagination';
import type { CollectibleStatus } from '../collectible-pagination';
import { CosmeticType } from '../entities/cosmetic-item.entity';

/**
 * Query das listagens do console. Página, tamanho e busca seguem lenientes (o serviço normaliza);
 * encaixe e estado são estritos: ausente é "todos", valor desconhecido é 400.
 */
export class CollectibleListQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;

  @IsOptional()
  @IsString()
  search?: string;

  /** Só vale na listagem de itens; a de kits ignora. */
  @IsOptional()
  @IsIn(Object.values(CosmeticType))
  type?: CosmeticType;

  @IsOptional()
  @IsIn(Object.values(COLLECTIBLE_STATUSES))
  status?: CollectibleStatus;
}
