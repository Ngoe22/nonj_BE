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
import { GroupMemberService } from '../../service/group_member/group_member.service.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../../_common/types/request.js';
import {
  GroupMemberUpdateAction,
  UpdateGroupMemberDto,
} from '../../dto/group_mem.dto.js';
import { ParseLimitPipe } from '../../../_common/pipe/ParseLimitPipe.js';




@Controller('group_member')
export class GroupMemberController {
  constructor(private readonly groupMemberService: GroupMemberService) {}

  @Get(':group_id')
  getMany(
    @Param('group_id') group_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.groupMemberService.getMany({
      group_id,
      requester_id: requester.id,
      page,
      limit,
    });
  }

  @Patch(':group_id/:target_id')
  update(
    @Param('group_id') group_id: string,
    @Param('target_id') target_id: string,
    @Body() body: UpdateGroupMemberDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    const actor_id = requester.id;
    switch (body.action) {
      case GroupMemberUpdateAction.PROMOTE:
        return this.groupMemberService.promoteToAdmin({
          group_id,
          actor_id,
          target_id,
        });
      case GroupMemberUpdateAction.DEMOTE:
        return this.groupMemberService.demoteToMember({
          group_id,
          actor_id,
          target_id,
        });
      case GroupMemberUpdateAction.REMOVE_ADMIN:
        return this.groupMemberService.founderRemoveAdmin({
          group_id,
          actor_id,
          target_id,
        });
    }
  }

  // @Delete('me/:group_id')     // route cụ thể — khai TRƯỚC
  // leave(...) { ... }

  @Delete('kick/:group_id/:user_id')
  delete(
    @Param('group_id') group_id: string,
    @Param('user_id') user_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.groupMemberService.kickMember({
      group_id,
      actor_id: requester.id,
      target_id: user_id,
    });
  }

  @Delete('quit/:group_id')
  leaveGroup(
    @Param('group_id') group_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.groupMemberService.leaveGroup({
      group_id,
      user_id: requester.id,
    });
  }

}
