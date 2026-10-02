import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { AdminListQueryDto } from '../../_common/dto/admin_list_query.dto.js';
import { Group_Join_Request_Status } from '../enum/group.enum.js';

/** Bộ lọc cho màn quản trị YÊU CẦU THAM GIA NHÓM */
export class AdminGroupJoinRequestQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  id?: string;

  /** Id người GỬI yêu cầu */
  @IsOptional()
  @IsString()
  @MaxLength(36)
  user_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  group_id?: string;

  @IsOptional()
  @IsEnum(Group_Join_Request_Status)
  status?: Group_Join_Request_Status;
}
