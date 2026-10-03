import { IsString, MaxLength, MinLength } from 'class-validator';


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
