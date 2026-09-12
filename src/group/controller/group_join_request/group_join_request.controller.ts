import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete, Query, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { GroupJoinRequestService } from '../../service/group_join_request/group_join_request.service.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../../_common/types/request.js';
import { CreateGroupJoinRequest, UpdateGroupJoinRequest } from '../../dto/join_group_request.dto.js';
import { ParseLimitPipe } from '../../../_common/pipe/ParseLimitPipe.js';

@Controller('group_join_request')
export class GroupJoinRequestController {
  constructor(private readonly joinRequestService: GroupJoinRequestService) {}

  @Get('group/:group_id')
  getManyForGroup(
    @Param('group_id') group_id: string,
    @Query('limit', new DefaultValuePipe(10), ParseLimitPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.joinRequestService.getManyForGroup({
      group_id,
      requester_id : requester.id,
      limit , page
    });
  }

  @Get('user/me')
  getManyForUser(
      @Query('limit', new DefaultValuePipe(10), ParseLimitPipe) limit: number,
      @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
      @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.joinRequestService.getManyForUser({
      user_id : requester.id,
      limit , page
    });
  }

  @Post(':group_id')
  create(
      @Param('group_id') group_id: string,
      @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.joinRequestService.create({
      requester_id : requester.id,
       group_id
    });
  }

  @Patch(':group_id/:user_id/:join_request_id')
  update(
    @Body() body: UpdateGroupJoinRequest,
    @Param('join_request_id') join_request_id: string,
    @Param('user_id') user_id: string,
    @Param('group_id') group_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.joinRequestService.update({
      body,
      user_id,
      group_id,
      join_request_id,
      group_admin_id: requester.id,
    });
  }

  @Delete(':join_request_id')
  delete(
    @Param('join_request_id') join_request_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.joinRequestService.hardDelete({
      join_request_id,
      user_id: requester.id,
    });
  }
}
