import { IsOptional, IsString, MaxLength } from 'class-validator';

import { AdminListQueryDto } from '../../_common/dto/admin_list_query.dto.js';

/**
 * Bộ lọc cho màn quản trị BÀI TẬP trong nhóm (group_post).
 *
 * Bỏ trống `group_id` / `collection_id` thì tìm trên TOÀN HỆ THỐNG (trang admin
 * cần vậy); truyền vào thì thành tìm trong 1 nhóm / 1 bộ sưu tập (drill-down).
 */
export class AdminPostQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  group_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  collection_id?: string;

  /** Tên đăng nhập của người GIAO BÀI */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  user_name?: string;
}
