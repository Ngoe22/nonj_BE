import { IsEnum, IsOptional } from 'class-validator';

import { UpdateUserDto } from './update-user.dto.js';
import { User_Status } from '../enums/user.enum.js';

/**
 * Admin sửa user — thêm quyền đổi `status`.
 *
 * Theo quyết định thiết kế: nút "xoá" trên UI = BAN (đổi status sang BANNED),
 * không xoá dữ liệu, để có thể mở lại.
 */
export class AdminUpdateUserDto extends UpdateUserDto {
  @IsOptional()
  @IsEnum(User_Status)
  status?: User_Status;
}
