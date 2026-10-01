import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Tự đổi mật khẩu — chỉ áp cho CHÍNH MÌNH.
 *
 * Bắt buộc `old_password` để chứng minh chủ tài khoản, rồi `new_password` mới.
 * (Form FE có thêm ô "nhập lại mật khẩu mới" nhưng chỉ để bắt khớp ở client,
 * không cần gửi lên BE.)
 */
export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  old_password: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  new_password: string;
}
