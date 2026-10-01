import { IsOptional, IsString, MaxLength } from 'class-validator';

import { AdminListQueryDto } from '../../_common/dto/admin_list_query.dto.js';

/**
 * Bộ lọc cho màn quản trị KHO ĐỀ CÁ NHÂN (question_preparation).
 * `user_name` là chủ sở hữu đề.
 */
export class AdminPreparationQueryDto extends AdminListQueryDto {
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
  collection_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  user_name?: string;
}
