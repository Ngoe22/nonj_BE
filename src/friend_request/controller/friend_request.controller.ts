import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FriendRequestService } from '../friend_request.service.js';
import {
  UpdateRequestFromReceiverDto,
} from '../dto/friend_request.dto.js';
import { GetRequesterInfo } from '../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../_common/types/request.js';
import { ParseLimitPipe } from '../../_common/pipe/ParseLimitPipe.js';


@Controller('friend_request')
export class FriendRequestController {
  constructor(private readonly friendRequestService: FriendRequestService) {}




  @Post(':receiver_id')
  create(
    @Param('receiver_id') receiver_id: string,
    @GetRequesterInfo() user: RequesterInfo,
  ) {
    return this.friendRequestService.add_request({

      sender_id: user.id,
      receiver_id,
    });
  }

  @Get("outgoing_requests")
  sending_request(
    @GetRequesterInfo() user: RequesterInfo,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.friendRequestService.get_many_request({
      user_id: user.id,
      limit,
      page,
      type :"outgoing_requests"
    }  );
  }

  @Get("ingoing_requests")
  pending_request(
    @GetRequesterInfo() user: RequesterInfo,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.friendRequestService.get_many_request({
      user_id: user.id,
      limit,
      page,
      type :"ingoing_requests"
    } );
  }

  @Patch(':request_id')
  receiver_update(
    @Body() body: UpdateRequestFromReceiverDto,
    @GetRequesterInfo() user: RequesterInfo,
    @Param('request_id') request_id: string,
  ) {
    return this.friendRequestService.receiver_update(request_id, user.id, body);
  }

  @Delete(':request_id')
  delete(
    @Param('request_id') request_id: string,
    @GetRequesterInfo() user: RequesterInfo,
  ) {
    return this.friendRequestService.soft_delete(request_id, user.id);
  }
}
