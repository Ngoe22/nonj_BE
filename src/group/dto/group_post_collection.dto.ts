import { IS_OPTIONAL, IsString, MaxLength, MinLength } from 'class-validator';
import { Optional } from '@nestjs/common';

export class CreatePostCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;

  @Optional()
  @IsString()
  @MaxLength(50)
  desc: string;
}

export class UpdatePostCollectionDto {
  @IsString()
  @MaxLength(50)
  title: string;

  @Optional()
  @IsString()
  @MaxLength(50)
  desc: string;
}
