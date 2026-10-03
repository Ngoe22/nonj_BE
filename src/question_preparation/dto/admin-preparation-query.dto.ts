import { IsOptional, IsString, MaxLength } from 'class-validator';

import { AdminListQueryDto } from '../../_common/dto/admin_list_query.dto.js';


export class AdminPreparationQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  collection_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  user_name?: string;
}
