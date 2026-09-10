import {IS_UUID, IsDateString, IsObject, IsString, IsUUID, MaxLength, MinLength} from 'class-validator';

export class CreateExerciseTemplateDto {

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string

  @IsUUID()
  collection: string //id

  @IsObject()
  exercise_content :object ;

}

export class UpdateExerciseTemplateDto {


  @IsUUID()
  collection: string //id

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string

  @IsObject()
  exercise_content :object ;

}

export class DeleteExerciseTemplateDto {

  @IsDateString()
  deleted_at : Date

  @IsUUID()
  deleted_by : string
}


