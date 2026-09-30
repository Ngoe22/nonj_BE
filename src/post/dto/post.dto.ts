import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Retake, View_Each_Other_Answer } from '../enum/post.enum.js';

/** Tạo post thủ công (soạn ngay trong nhóm, giống builder preparation) */
export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Mảng section ĐÃ TÁCH ĐÁP ÁN — cùng shape với QuestionPreparation.content */
  @IsArray()
  content: object[];

  @IsOptional()
  @IsArray()
  correct_answer?: object[] | null;

  @IsOptional()
  @IsEnum(Retake)
  retake?: Retake;

  /** Không có deadline = không giới hạn thời gian */
  @IsOptional()
  @IsDateString()
  deadline_at?: string;

  @IsOptional()
  @IsEnum(View_Each_Other_Answer)
  view_each_other_answer?: View_Each_Other_Answer;
}

/**
 * Tạo post bằng cách COPY nội dung từ kho question_preparation của chính mình.
 * BE đọc preparation rồi copy `content` + `correct_answer` sang post — không
 * tham chiếu, nên sau này sửa kho cá nhân không làm đổi đề trong nhóm.
 */
export class CreatePostFromPreparationDto {
  @IsUUID()
  preparation_id: string;

  /** Bỏ trống thì lấy theo title của preparation */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(Retake)
  retake?: Retake;

  @IsOptional()
  @IsDateString()
  deadline_at?: string;

  @IsOptional()
  @IsEnum(View_Each_Other_Answer)
  view_each_other_answer?: View_Each_Other_Answer;
}

/**
 * Sửa post — CỐ Ý chỉ cho sửa các field "bọc ngoài".
 *
 * KHÔNG cho sửa `content` / `correct_answer` / `retake`: bài làm của học viên đã
 * gửi trước đó tham chiếu tới đúng thứ tự section/item, đổi câu hỏi sẽ khiến
 * các bài làm cũ bị lệch và chấm sai.
 */
export class UpdatePostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsDateString()
  deadline_at?: string;

  @IsOptional()
  @IsEnum(View_Each_Other_Answer)
  view_each_other_answer?: View_Each_Other_Answer;
}
