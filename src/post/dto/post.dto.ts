import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength
} from "class-validator";
import {Exercise_Type, Post_Type, View_Each_Other_Answer} from "../enum/post.enum.js";
export class CreateExercisePostDto {
    @IsString() @MinLength(1) @MaxLength(50)
    title: string;

    @IsOptional() @IsString()
    description?: string;

    @IsEnum(Exercise_Type)
    question_type: Exercise_Type;

    question_content: any;   // hoàn thiện sau

    @IsOptional() @IsUUID()
    source_template?: string;

}

export class CreateExamPostDto {
    @IsString() @MinLength(1) @MaxLength(50)
    title: string;

    @IsOptional() @IsString()
    description?: string;

    @IsEnum(Exercise_Type)
    question_type: Exercise_Type;

    question_content: any;


    @IsDateString()   // bắt buộc với EXAM
    deadline_at: string;

    @IsEnum(View_Each_Other_Answer)
    view_each_other_answer: View_Each_Other_Answer;
}


export class UpdatePostDto {
    @IsOptional() @IsString() @MinLength(1) @MaxLength(50)
    title?: string;

    @IsOptional() @IsString()
    description?: string;

    @IsOptional() @IsDateString()
    deadline_at?: string;

    @IsEnum(View_Each_Other_Answer)
    view_each_other_answer: View_Each_Other_Answer;

}