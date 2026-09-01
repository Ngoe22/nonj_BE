import { PartialType } from '@nestjs/mapped-types';
import { CreateUserNotifDto } from './create-user_notif.dto.js';

export class UpdateUserNotifDto extends PartialType(CreateUserNotifDto) {
  id: number;
}
