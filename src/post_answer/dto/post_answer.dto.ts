import {IsEnum, IsOptional, IsString} from "class-validator";
import {Post_Answer_Status} from "../enum/post_answer.enum.js";

export class CreatePostAnswerDto {
    answer_content: any;   // jsonb, tự do — hoàn thiện sau
}



export class GradePostAnswerDto {
    @IsEnum(Post_Answer_Status)
    status: Post_Answer_Status;

    @IsOptional()
    @IsString()
    review_content: any;
}