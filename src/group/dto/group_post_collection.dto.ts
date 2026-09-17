import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePostCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;
}

export class UpdatePostCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;
}
