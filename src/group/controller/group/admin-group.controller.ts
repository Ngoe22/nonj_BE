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

import { GroupService } from '../../service/group/group.service.js';
import { ParseLimitPipe } from '../../../_common/pipe/ParseLimitPipe.js';
import { UpdateGroupDto } from '../../dto/group.dto.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../../_common/types/request.js';
import { UserGuard } from '../../../_other_module/guards/user.guard.js';
import { User_Role } from '../../../user/enums/user.enum.js';

/**
 * Trước đây controller này THIẾU `UserGuard([SYSTEM_ADMIN])` trong khi 11
 * controller admin khác đều có -> bất kỳ user đã đăng nhập nào cũng gọi được
 * `GET/PATCH/DELETE /admin/group` (sửa và xoá mềm mọi nhóm).
 */
@Controller('admin/group')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminGroupController {
  constructor(private readonly groupService: GroupService) {}

  // route tĩnh phải khai TRƯỚC route `:group_id`, nếu không `/admin/group/many`
  // sẽ bị nuốt bởi `:group_id` = 'many'
  @Get('many')
  getMany(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.groupService.adminFindMany({ page, limit });
  }

  @Get(':group_id')
  getOne(@Param('group_id') group_id: string) {
    return this.groupService.adminFindById(group_id);
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
