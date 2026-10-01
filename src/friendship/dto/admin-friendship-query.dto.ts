import { IsOptional, IsString, MaxLength } from 'class-validator';

import { AdminListQueryDto } from '../../_common/dto/admin_list_query.dto.js';

/**
 * Bộ lọc cho màn quản trị BẠN BÈ (bảng `friendship` — các cặp đã kết bạn).
 *
 * `user_name` khớp ở CẢ HAI phía của quan hệ.
 */
export class AdminFriendshipQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  user_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  a_user_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  b_user_name?: string;
}
