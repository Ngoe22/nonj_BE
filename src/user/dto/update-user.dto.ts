
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Optional } from '@nestjs/common';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password?: string;

  @Optional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nickname?: string;

  @Optional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bio?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;
}
