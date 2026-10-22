import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SCHOOL_PILOT_STATUSES } from '../entities/school-pilot.entity';

export class SaveSchoolPilotDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  objective: string;

  @IsIn(SCHOOL_PILOT_STATUSES)
  status: (typeof SCHOOL_PILOT_STATUSES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  contactAdminUserId?: number | null;

  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string | null;

  @IsOptional()
  @IsDateString({ strict: true })
  agreedEndDate?: string | null;

  @IsOptional()
  @IsDateString({ strict: true })
  nextWeeklyMeetingAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  nextAction?: string | null;

  @IsOptional()
  @IsDateString({ strict: true })
  nextActionAt?: string | null;
}
