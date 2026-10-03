import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/**
 */
export class AdminListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  /** `created_at >= created_from` (ISO date) */
  @IsOptional()
  @IsDateString()
  created_from?: string;

  /** `created_at <= created_to` (ISO date) */
  @IsOptional()
  @IsDateString()
  created_to?: string;

  /**
   * `true` = TRẢ CẢ bản ghi đã xoá mềm (mặc định chỉ trả bản ghi còn sống).
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  with_deleted?: boolean = false;
}
