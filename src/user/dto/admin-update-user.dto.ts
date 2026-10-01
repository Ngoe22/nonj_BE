import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { User_Status } from '../enums/user.enum.js';

/**
 * Admin sửa user — thêm quyền đổi `user_name` + `email`.
 *
 * CỐ Ý KHÔNG có `password`: admin KHÔNG được đặt thẳng mật khẩu. Muốn thì bấm
 * "reset password" (một endpoint riêng) để gửi mật khẩu mới qua email.
 */
export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    context: { errorCode: 'only_letter_and_number_and_underscore' },
  })
  user_name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bio?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsEnum(User_Status)
  status?: User_Status;
}
