import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateGroupCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;
}

export class UpdateGroupCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;
}
