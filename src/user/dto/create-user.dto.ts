import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Optional } from '@nestjs/common';
import { Column } from 'typeorm';

export class CreateUserDto {


  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+$/, { context: { errorCode: 'only_letter_and_number' } })
  user_name: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @IsString()
  @MinLength(10)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nickname: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bio?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;
}
