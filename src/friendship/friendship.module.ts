import {forwardRef, Module} from '@nestjs/common';
import { FriendshipService } from './friendship.service.js';
import { FriendshipController } from './controller/friendship.controller.js';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Friendship} from "./entities/friendship.entity.js";
import {UserModule} from "../user/user.module.js";
import {FriendRequestModule} from "../friend_request/friend_request.module.js";

@Module({
  imports: [TypeOrmModule.forFeature([Friendship])  ] ,
  controllers: [FriendshipController],
  providers: [FriendshipService],
  exports: [FriendshipService],
})
export class FriendshipModule {}
