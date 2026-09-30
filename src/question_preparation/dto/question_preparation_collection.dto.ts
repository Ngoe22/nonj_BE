import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateQuestionPreparationCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  desc?: string;
}

export class UpdateQuestionPreparationCollectionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  desc?: string;
}
