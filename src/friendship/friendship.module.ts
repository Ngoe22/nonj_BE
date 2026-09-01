import { Module } from '@nestjs/common';
import { FriendshipService } from './friendship.service.js';
import { FriendshipController } from './friendship.controller.js';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Friendship} from "./entities/friendship.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([Friendship])] ,
  controllers: [FriendshipController],
  providers: [FriendshipService],
})
export class FriendshipModule {}
