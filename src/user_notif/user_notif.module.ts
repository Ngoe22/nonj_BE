import { Module } from '@nestjs/common';
import { UserNotifService } from './user_notif.service.js';
import { UserNotifGateway } from './user_notif.gateway.js';
import {TypeOrmModule} from "@nestjs/typeorm";
import {UserNotif} from "./entities/user_notif.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([UserNotif])] ,
  providers: [UserNotifGateway, UserNotifService],
})
export class UserNotifModule {}
