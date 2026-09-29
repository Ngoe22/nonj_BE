import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum, IsObject,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength
} from "class-validator";
import {Retake, View_Each_Other_Answer} from "../enum/post.enum.js";
export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  question_content: any; // hoàn thiện sau

  @IsObject()
  correct_answer?: any; // hoàn thiện sau

  @IsEnum(Retake)
  Retake: Retake;

  @IsDateString() // bắt buộc với EXAM
  deadline_at: string;

  @IsEnum(View_Each_Other_Answer)
  view_each_other_answer: View_Each_Other_Answer;
}

export class UpdatePostDto {
    @IsOptional() @IsString() @MinLength(1) @MaxLength(50)
    title?: string;

    @IsOptional() @IsString()
    description?: string;

    @IsEnum(Retake)
    Retake: Retake;

    @IsOptional()
    @IsDateString()
    deadline_at?: string;

    @IsEnum(View_Each_Other_Answer)
    view_each_other_answer: View_Each_Other_Answer;

}