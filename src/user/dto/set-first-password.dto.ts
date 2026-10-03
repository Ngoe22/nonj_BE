import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Đặt mật khẩu LẦN ĐẦU — chỉ cho tài khoản CHƯA có mật khẩu (đăng ký bằng Google).
 *
 * KHÔNG cần `old_password` vì tài khoản này vốn chưa có mật khẩu để chứng minh
 * danh tính (mật khẩu đang là `null`). Người dùng nhập 2 lần để bắt khớp ở
 * client, BE chỉ nhận `new_password`.
 */
export class SetFirstPasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  new_password: string;
}
