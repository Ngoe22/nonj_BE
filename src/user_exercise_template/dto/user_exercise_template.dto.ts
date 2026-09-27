import { IsDateString, IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength} from 'class-validator';

export class CreateExerciseTemplateDto {

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string

  @IsUUID()
  collection: string //id

  // FE chưa có UI nhập nội dung → cho phép thiếu, service sẽ lưu `{}`
  @IsOptional()
  @IsObject()
  exercise_content?: object;
}

export class UpdateExerciseTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsObject()
  exercise_content?: object;
}

export class DeleteExerciseTemplateDto {

  @IsDateString()
  deleted_at : Date

  @IsUUID()
  deleted_by : string
}


