import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserNotif } from './entities/user_notif.entity.js';
import { JwtModule } from '@nestjs/jwt';
import { UserNotifController } from './controller/user_notif.controller.js';
import { UserNotifService } from './user_notif.service.js';
import { NotifGateway } from './user_notif.gateway.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserNotif]),
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  controllers: [UserNotifController],
  providers: [UserNotifService, NotifGateway],
  exports: [UserNotifService], // để module khác (FriendRequest, GroupJoinRequest...) inject dùng
})
export class UserNotifModule {}
