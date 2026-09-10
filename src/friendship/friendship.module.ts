import { Module } from '@nestjs/common';
import { FriendshipService } from './friendship.service.js';
import { FriendshipController } from './controller/friendship.controller.js';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Friendship} from "./entities/friendship.entity.js";
import {UserModule} from "../user/user.module.js";

@Module({
  imports: [TypeOrmModule.forFeature([Friendship]) , UserModule] ,
  controllers: [FriendshipController],
  providers: [FriendshipService],
  exports: [FriendshipService],
})
export class FriendshipModule {}
