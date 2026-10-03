import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { AdminListQueryDto } from '../../_common/dto/admin_list_query.dto.js';
import { Friend_Request_Status } from '../enum/friend_request.enum.js';

/**
 */
export class AdminFriendRequestQueryDto extends AdminListQueryDto {
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
  sender_user_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  receiver_user_name?: string;

  @IsOptional()
  @IsEnum(Friend_Request_Status)
  status?: Friend_Request_Status;
}
