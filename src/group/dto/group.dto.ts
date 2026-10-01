import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Group_Join_Mode, Group_View_Mode } from '../enum/group.enum.js';

export class CreateGroupDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9]+$/)
  @MaxLength(50)
  slug: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(Group_Join_Mode)
  join_mode?: Group_Join_Mode;

  @IsOptional()
  @IsEnum(Group_View_Mode)
  view_mode?: Group_View_Mode;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(Group_Join_Mode)
  join_mode?: Group_Join_Mode;

  @IsOptional()
  @IsEnum(Group_View_Mode)
  view_mode?: Group_View_Mode;
}
