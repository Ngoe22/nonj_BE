import { IsEnum, IsOptional } from 'class-validator';
import { User_Setting_Who_can_see_template } from '../enums/user.enum.js';

export class UpdateUserSettingDto {
  @IsOptional()
  @IsEnum(User_Setting_Who_can_see_template)
  who_can_see_my_template?: User_Setting_Who_can_see_template;
}
