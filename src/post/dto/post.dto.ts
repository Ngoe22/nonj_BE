import { IsFutureDate } from '../../_common/decorators/validator/is_future_date.decorator.js';
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

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  content: object[];

  @IsOptional()
  @IsArray()
  correct_answer?: object[] | null;

  @IsOptional()
  @IsEnum(Retake)
  retake?: Retake;

  @IsOptional()
  @IsDateString()
  @IsFutureDate()
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
  @IsFutureDate()
  deadline_at?: string;

  @IsOptional()
  @IsEnum(View_Each_Other_Answer)
  view_each_other_answer?: View_Each_Other_Answer;
}

/**
 * Sửa post — CỐ Ý chỉ cho sửa các field "bọc ngoài".
 *
 * KHÔNG cho sửa `content` / `correct_answer`: bài làm của học viên đã gửi trước
 * đó tham chiếu tới đúng thứ tự section/item, đổi câu hỏi sẽ khiến các bài làm
 * cũ bị lệch và chấm sai.
 *
 * `retake` thì CHO sửa — nó chỉ quyết định có cho làm lượt MỚI hay không, không
 * đụng tới bài đã nộp nên không làm lệch dữ liệu cũ.
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

  /**
   * KHÔNG gắn `@IsFutureDate()` ở đây: sửa tiêu đề của một bài ĐÃ hết hạn vẫn
   * gửi kèm hạn cũ, gắn validator sẽ chặn luôn việc sửa. Kiểm tra "tương lai
   * hoặc giữ nguyên hạn cũ" nằm ở `PostService.update`.
   */
  @IsOptional()
  @IsDateString()
  deadline_at?: string;

  @IsOptional()
  @IsEnum(View_Each_Other_Answer)
  view_each_other_answer?: View_Each_Other_Answer;

  @IsOptional()
  @IsEnum(Retake)
  retake?: Retake;
}
