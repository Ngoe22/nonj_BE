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
 * Tham số CHUNG cho mọi endpoint danh sách của admin.
 *
 * Lưu ý: global ValidationPipe KHÔNG bật `enableImplicitConversion`, mà query
 * param thì luôn là string — nên phải tự chuyển kiểu bằng `@Type`/`@Transform`,
 * không dựa vào ép kiểu ngầm.
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
   *
   * Khi bật, mỗi dòng có thêm `is_deleted` + `deleted_at` để FE hiển thị trạng
   * thái và cho khôi phục.
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  with_deleted?: boolean = false;
}
