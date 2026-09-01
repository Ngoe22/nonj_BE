import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { UserNotifService } from './user_notif.service.js';
import { CreateUserNotifDto } from './dto/create-user_notif.dto.js';
import { UpdateUserNotifDto } from './dto/update-user_notif.dto.js';

@WebSocketGateway()
export class UserNotifGateway {
  constructor(private readonly userNotifService: UserNotifService) {}

  @SubscribeMessage('createUserNotif')
  create(@MessageBody() createUserNotifDto: CreateUserNotifDto) {
    return this.userNotifService.create(createUserNotifDto);
  }

  @SubscribeMessage('findAllUserNotif')
  findAll() {
    return this.userNotifService.findAll();
  }

  @SubscribeMessage('findOneUserNotif')
  findOne(@MessageBody() id: number) {
    return this.userNotifService.findOne(id);
  }

  @SubscribeMessage('updateUserNotif')
  update(@MessageBody() updateUserNotifDto: UpdateUserNotifDto) {
    return this.userNotifService.update(updateUserNotifDto.id, updateUserNotifDto);
  }

  @SubscribeMessage('removeUserNotif')
  remove(@MessageBody() id: number) {
    return this.userNotifService.remove(id);
  }
}
