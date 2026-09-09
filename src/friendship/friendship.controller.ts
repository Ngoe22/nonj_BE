import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FriendshipService } from './friendship.service.js';
import {GetRequesterInfo} from "../_common/decorators/param/request_payload.decorator.js";
import type {RequesterInfo} from "../_common/types/request.js";

@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}


  @Delete(':id')
  async delete(
      @Param('id') id: string ,
      @GetRequesterInfo() userInfo: RequesterInfo
  ) {
    return await this.friendshipService.delete({ user_id : userInfo.id , id })
  }

}
