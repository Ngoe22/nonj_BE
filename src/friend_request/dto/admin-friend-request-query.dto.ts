import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { AdminListQueryDto } from '../../_common/dto/admin_list_query.dto.js';
import { Friend_Request_Status } from '../enum/friend_request.enum.js';

/**
 * Bộ lọc cho màn quản trị QUAN HỆ BẠN BÈ.
 *
 * `user_name` khớp ở CẢ HAI phía (người gửi HOẶC người nhận) vì admin thường
 * chỉ nhớ tên một người. Muốn giới hạn một phía thì dùng 2 field riêng bên dưới.
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
