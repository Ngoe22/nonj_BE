import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { AdminListQueryDto } from '../../_common/dto/admin_list_query.dto.js';
import {
  Group_Join_Mode,
  Group_View_Mode,
} from '../enum/group.enum.js';

/**
 * Bộ lọc cho màn quản trị nhóm.
 * `id` / `slug` / `name` khớp một phần (LIKE, không phân biệt hoa thường).
 */
export class AdminGroupQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  /** Tên đăng nhập của người tạo nhóm */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  founder_user_name?: string;

  @IsOptional()
  @IsEnum(Group_Join_Mode)
  join_mode?: Group_Join_Mode;

  @IsOptional()
  @IsEnum(Group_View_Mode)
  view_mode?: Group_View_Mode;
}
