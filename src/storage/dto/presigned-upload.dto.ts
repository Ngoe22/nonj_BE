import { IsString, IsIn, IsOptional, MaxLength } from 'class-validator';
import { STORAGE_FOLDER } from '../storage.constant.js';

export class PresignedUploadDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(100)
  contentType: string;

  /**
   * Không bắt buộc: bỏ trống thì BE tự chọn thư mục theo `fileType`
   * (question_preparation/images hoặc .../audio).
   */
  @IsOptional()
  @IsString()
  @IsIn(Object.values(STORAGE_FOLDER))
  folder?: string;

  @IsString()
  @IsIn(['image', 'audio'])
  fileType: 'image' | 'audio';
}
