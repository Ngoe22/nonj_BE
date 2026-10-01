import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Chọn username (dùng sau khi đăng ký bằng Google — lúc đó tài khoản chưa có
 * username). Quy tắc trùng với lúc đăng ký bằng email.
 */
export class SetUsernameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    context: { errorCode: 'only_letter_and_number_and_underscore' },
  })
  user_name: string;
}
