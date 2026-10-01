import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { AdminListQueryDto } from '../../_common/dto/admin_list_query.dto.js';
import { Report_Status, Target_Type } from '../enum/report.enum.js';

/** Bộ lọc cho màn quản trị BÁO CÁO VI PHẠM */
export class AdminReportQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  id?: string;

  /** Tên đăng nhập của người gửi báo cáo */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  user_name?: string;

  @IsOptional()
  @IsEnum(Report_Status)
  status?: Report_Status;

  @IsOptional()
  @IsEnum(Target_Type)
  target_type?: Target_Type;
}
