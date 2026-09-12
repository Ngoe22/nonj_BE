import {IsBoolean, IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength} from "class-validator";

export class CreatePostDto {
    @IsString() @MinLength(1) @MaxLength(50)
    title: string;

    @IsOptional() @IsString()
    description?: string;

    @IsOptional() @IsDateString()
    deadline_at?: string;

    @IsOptional() @IsBoolean()
    is_retake?: boolean;

    @IsOptional() @IsBoolean()
    view_each_other_score?: boolean;

    @IsOptional()
    exercise_content: any;   // DTO tạm, hoàn thiện sau

    @IsOptional() @IsUUID()
    source_template_id?: string;
}

export class UpdatePostDto {
    @IsOptional() @IsString() @MinLength(1) @MaxLength(50)
    title?: string;

    @IsOptional() @IsString()
    description?: string;

    @IsOptional() @IsDateString()
    deadline_at?: string;

    @IsOptional() @IsBoolean()
    is_retake?: boolean;

    @IsOptional() @IsBoolean()
    view_each_other_score?: boolean;

    @IsOptional()
    exercise_content?: any;
}