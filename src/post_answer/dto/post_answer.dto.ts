import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Post_Answer_Status } from '../enum/post_answer.enum.js';

/**
 * Bài nộp. `answer_content` KHÔNG chứa `point` — điểm nằm ở `post.content`,
 * BE tự lấy để chấm.
 */
export class CreatePostAnswerDto {
  @IsArray()
  answer_content: any[];
}

/** Chấm tay MỘT section tự luận */
export class GradeSectionDto {
  /** vị trí section trong `post.content` */
  @IsInt()
  @Min(0)
  index: number;

  /** điểm giáo viên cho section này */
  @IsNumber()
  @Min(0)
  point: number;

  /**
   * Ghi đè ĐÁP ÁN MẪU của section — lưu vào `post.correct_answer[index]` nên
   * mọi học viên đều thấy đáp án mới. Bỏ trống = giữ nguyên.
   */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  sample_answer?: string;

  /** Nhận xét riêng cho section này */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class GradePostAnswerDto {
  /** Chấm từng section tự luận */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeSectionDto)
  sections?: GradeSectionDto[];

  /**
   * Ghi đè TỔNG điểm. Bỏ trống = điểm trắc nghiệm (auto) + điểm tự luận (tay).
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  point?: number;

  /** Nhận xét chung cho cả bài */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  review_note?: string;

  @IsOptional()
  @IsEnum(Post_Answer_Status)
  status?: Post_Answer_Status;
}
