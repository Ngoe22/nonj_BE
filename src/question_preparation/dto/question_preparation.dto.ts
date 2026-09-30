import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * `content` và `correct_answer` đều là MẢNG:
 *  - content        = mảng section (đã tách đáp án)
 *  - correct_answer = mảng đáp án song song theo [sectionIndex][itemIndex]
 * nên dùng @IsArray, KHÔNG dùng @IsObject (IsObject từ chối array).
 */
export class CreateQuestionPreparationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;

  /** id của QuestionPreparationCollection */
  @IsUUID()
  collection: string;

  @IsArray()
  content: object[];

  @IsOptional()
  @IsArray()
  correct_answer?: object[] | null;
}

export class UpdateQuestionPreparationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsArray()
  content?: object[];

  @IsOptional()
  @IsArray()
  correct_answer?: object[] | null;
}
