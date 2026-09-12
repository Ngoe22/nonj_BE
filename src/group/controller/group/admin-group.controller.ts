import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { GroupService } from '../../service/group/group.service.js';
import { ParseLimitPipe } from '../../../_common/pipe/ParseLimitPipe.js';
import { UpdateGroupDto } from '../../dto/group.dto.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../../_common/types/request.js';

@Controller('admin/group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get(':group_id')
  getOne(@Param('group_id') group_id: string) {
    return this.groupService.adminFindById(group_id);
  }

  @Get('many')
  getMany(
    @Param('group_id') group_id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.groupService.adminFindMany({ page, limit });
  }

  @Patch(':group_id')
  update(
    @Param('group_id') group_id: string,
    @Body() body: UpdateGroupDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.groupService.adminUpdate({
      group_id,
      body,
      sysadmin_id: requester.id,
    });
  }

  @Delete(':group_id')
  delete(
    @Param('group_id') group_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.groupService.adminSoftDelete({
      group_id,
      sysadmin_id: requester.id,
    });
  }
}