import { Module } from '@nestjs/common';
import { FriendRequestService } from './friend_request.service.js';
import { FriendRequestController } from './friend_request.controller.js';
import {TypeOrmModule} from "@nestjs/typeorm";
import {FriendRequest} from "./entities/friend_request.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([FriendRequest])] ,
  controllers: [FriendRequestController],
  providers: [FriendRequestService],
})
export class FriendRequestModule {}
