import {forwardRef, Module} from '@nestjs/common';
import { FriendRequestService } from './friend_request.service.js';
import { FriendRequestController } from './controller/friend_request.controller.js';
import {TypeOrmModule} from "@nestjs/typeorm";
import {FriendRequest} from "./entities/friend_request.entity.js";
import { UserModule } from '../user/user.module.js';
import {AdminFriendReqController} from "./controller/admin-friend_request.controller.js";
import {FriendshipModule} from "../friendship/friendship.module.js";

@Module({
  imports: [TypeOrmModule.forFeature([FriendRequest]) , FriendshipModule   ] ,
  controllers: [FriendRequestController,AdminFriendReqController],
  providers: [FriendRequestService],
  exports: [FriendRequestService],
})
export class FriendRequestModule {}
