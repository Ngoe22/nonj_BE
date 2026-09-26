import {Controller, Get, Post, Body, Patch, Param, Delete, Query, DefaultValuePipe, ParseIntPipe} from '@nestjs/common';
import { FriendshipService } from '../friendship.service.js';
import {GetRequesterInfo} from "../../_common/decorators/param/request_payload.decorator.js";
import type {RequesterInfo} from "../../_common/types/request.js";
import {ParseLimitPipe} from "../../_common/pipe/ParseLimitPipe.js";

@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}


  // add_friend be called from friend quest service

  @Get()
  getMyFriends(
    @GetRequesterInfo() userInfo: RequesterInfo,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.friendshipService.getMany({
      user_id: userInfo.id,
      limit,
      page,
    });
  }

  // unfriend
  @Patch(':friend_id')
  async delete(
    @Param('friend_id') friend_id: string,
    @GetRequesterInfo() userInfo: RequesterInfo,
  ) {
    return await this.friendshipService.delete({
      user_id: userInfo.id,
      friend_id,
    });
  }
}


// @Get('search/:user_name')
// findByUsername(
//     @GetRequesterInfo() requester: RequesterInfo,
//     @Param('user_name') user_name: string
// ) {
//   return this.friendshipService.searchUserName({
//     requester_id: requester.id,
//     search_target_username: user_name,
//   });
// }

