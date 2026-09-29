import {
  IsArray,
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Column } from 'typeorm';

export class CreateExerciseTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;

  @IsUUID()
  collection: string; //id

  @IsArray()
  preparation_content: object;

  @IsArray()
  @IsOptional()
  correct_answer: object | null;
}

export class UpdateExerciseTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsObject()
  preparation_content?: object;

  @IsOptional()
  @IsObject()
  correct_answer?: object;
}

export class DeleteExerciseTemplateDto {

  @IsDateString()
  deleted_at : Date

  @IsUUID()
  deleted_by : string
}


