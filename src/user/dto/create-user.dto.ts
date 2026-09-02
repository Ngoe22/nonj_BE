import { IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Optional } from '@nestjs/common';
import { Column } from 'typeorm';

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  @Matches(/^[a-z0-9]+$/)
  user_name: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(10)
  email: string;

  @IsString()
  @MinLength(1)
  nickname: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;
}
