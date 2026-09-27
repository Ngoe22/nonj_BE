import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePostCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  desc?: string;
}

export class UpdatePostCollectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  desc?: string;
}
