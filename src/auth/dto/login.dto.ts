import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(10)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;

}
