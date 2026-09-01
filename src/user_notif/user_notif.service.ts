import { Injectable } from '@nestjs/common';
import { CreateUserNotifDto } from './dto/create-user_notif.dto.js';
import { UpdateUserNotifDto } from './dto/update-user_notif.dto.js';

@Injectable()
export class UserNotifService {
  create(createUserNotifDto: CreateUserNotifDto) {
    return 'This action adds a new userNotif';
  }

  findAll() {
    return `This action returns all userNotif`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userNotif`;
  }

  update(id: number, updateUserNotifDto: UpdateUserNotifDto) {
    return `This action updates a #${id} userNotif`;
  }

  remove(id: number) {
    return `This action removes a #${id} userNotif`;
  }
}
