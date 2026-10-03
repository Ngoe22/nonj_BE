import { IsString, MaxLength, MinLength } from 'class-validator';


export class SetFirstPasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(50)
  new_password: string;
}
