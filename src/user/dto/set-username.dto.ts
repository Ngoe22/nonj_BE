import { IsString, Matches, MaxLength, MinLength } from 'class-validator';


export class SetUsernameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    context: { errorCode: 'only_letter_and_number_and_underscore' },
  })
  user_name: string;
}
