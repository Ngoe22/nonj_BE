import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { GroupMemberService } from '../../service/group_member/group_member.service.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../../_common/types/request.js';
import { ParseLimitPipe } from '../../../_common/pipe/ParseLimitPipe.js';
import { UserGuard } from '../../../_other_module/guards/user.guard.js';
import { User_Role } from '../../../user/enums/user.enum.js';
import { AdminSetGroupMemberRoleDto } from '../../dto/group_mem.dto.js';

@Controller('admin/group_member')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminGroupMemberController {
  constructor(private readonly groupMemberService: GroupMemberService) {}

  @Get(':group_id')
  getMany(
    @Param('group_id') group_id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.groupMemberService.adminGetMany({ group_id, page, limit });
  }

  @Patch(':group_id/:user_id')
  setRole(
    @Param('group_id') group_id: string,
    @Param('user_id') user_id: string,
    @Body() body: AdminSetGroupMemberRoleDto,
  ) {
    return this.groupMemberService.adminSetRole({
      group_id,
      user_id,
      role: body.role,
    });
  }

  @Delete(':group_id/:user_id')
  remove(
    @Param('group_id') group_id: string,
    @Param('user_id') user_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.groupMemberService.adminRemoveMember({
      group_id,
      user_id,
      admin_id: requester.id,
    });
  }
}
