import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Trước đây `nickname` và `bio` dùng `@Optional()` của @nestjs/common — đó là
 * decorator của DI, KHÔNG phải validator, nên 2 field đó thành BẮT BUỘC và
 * `PATCH /user/me` luôn đòi `nickname`. Đổi sang `@IsOptional()`.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password?: string;

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
}
