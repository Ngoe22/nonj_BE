import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';

import { UserNotifService } from '../user_notif.service.js';
import { MarkManyReadDto } from '../dto/update-user_notif.dto.js';
import type { RequesterInfo } from '../../_common/types/request.js';
import { GetRequesterInfo } from '../../_common/decorators/param/request_payload.decorator.js';
import { ParseLimitPipe } from '../../_common/pipe/ParseLimitPipe.js';

@Controller('user_notif')
export class UserNotifController {
  constructor(private readonly notifService: UserNotifService) {}

  @Get()
  getMany(
    @GetRequesterInfo() requester: RequesterInfo,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.notifService.findMany({ user_id: requester.id, page, limit });
  }

  @Get('unread-count')
  countUnread(@GetRequesterInfo() requester: RequesterInfo) {
    return this.notifService.countUnread({ user_id: requester.id });
  }

  // route 1 segment khai TRƯỚC route 2 segment cho rõ ràng
  @Patch('read-all')
  markAllAsRead(@GetRequesterInfo() requester: RequesterInfo) {
    return this.notifService.markAllAsRead({ user_id: requester.id });
  }

  @Patch('read-many')
  markManyAsRead(
    @Body() body: MarkManyReadDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.notifService.markManyAsRead({
      user_id: requester.id,
      notif_ids: body.notif_ids ?? [],
    });
  }

  @Patch(':notif_id/read')
  markAsRead(
    @Param('notif_id') notif_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.notifService.markAsRead({ user_id: requester.id, notif_id });
  }
}
