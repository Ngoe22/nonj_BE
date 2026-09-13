import {IsEnum, IsOptional, IsString, IsUUID, MaxLength} from "class-validator";
import {Report_Action, Report_Reason, Report_Status, Target_Type} from "../enum/report.enum.js";

export class CreateReportDto {
    @IsEnum(Target_Type)
    target_type: Target_Type;

    @IsUUID()
    target_id: string;

    @IsEnum(Report_Reason)
    reason: Report_Reason;

    @IsString()
    @MaxLength(1000)
    description: string;
}

export class ReviewReportDto {
    @IsEnum(Report_Status)
    status: Report_Status;

    @IsEnum(Report_Action)
    action_taken: Report_Action;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    review_note?: string;
}