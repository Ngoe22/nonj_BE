import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {


  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, { context: { errorCode: 'only_letter_and_number_and_underscore' } })
  user_name: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

  @IsEmail()
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
