import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { AdminListQueryDto } from '../../_common/dto/admin_list_query.dto.js';
import { User_Role, User_Status } from '../enums/user.enum.js';


export class AdminUserQueryDto extends AdminListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  user_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsEnum(User_Role)
  role?: User_Role;

  @IsOptional()
  @IsEnum(User_Status)
  status?: User_Status;
}
