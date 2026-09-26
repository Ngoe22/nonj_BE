import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

}

/** Body của POST /auth/google — `credential` là ID token do GIS trả về ở FE */
export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  credential: string;
}
