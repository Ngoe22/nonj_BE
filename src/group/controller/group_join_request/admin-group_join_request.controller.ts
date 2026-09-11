import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserGuard } from '../../../_other_module/guards/user.guard.js';
import { User_Role } from '../../../user/enums/user.enum.js';
import { GroupJoinRequestService } from '../../service/group_join_request/group_join_request.service.js';
import { ParseLimitPipe } from '../../../_common/pipe/ParseLimitPipe.js';
import { UpdateGroupJoinRequest } from '../../dto/join_group_request.dto.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../../_common/types/request.js';

@Controller('admin/group_join_request')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminGroupJoinRequestController {
  constructor(private readonly joinRequestService: GroupJoinRequestService) {}

  @Get('group/:group_id')
  getMany(
    @Param('group_id') group_id: string,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.joinRequestService.adminGetMany({ group_id, limit, page });
  }

  @Get(':join_request_id')
  getOne(@Param('join_request_id') join_request_id: string) {
    return this.joinRequestService.adminGetOne({ join_request_id });
  }

  @Patch(':join_request_id')
  update(
    @Body() body: UpdateGroupJoinRequest,
    @Param('join_request_id') join_request_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.joinRequestService.adminUpdate({
      body,
      join_request_id,
      sys_admin_id: requester.id,
    });
  }

  @Delete(':join_request_id')
  delete(@Param('join_request_id') join_request_id: string) {
    return this.joinRequestService.adminHardDelete({ join_request_id });
  }
}
