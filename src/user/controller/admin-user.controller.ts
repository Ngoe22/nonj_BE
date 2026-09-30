import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { UserService } from '../user.service.js';
import { AdminUpdateUserDto } from '../dto/admin-update-user.dto.js';
import { UserGuard } from '../../_other_module/guards/user.guard.js';
import { User_Role } from '../enums/user.enum.js';
import { ParseLimitPipe } from '../../_common/pipe/ParseLimitPipe.js';
import { GetRequesterInfo } from '../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../_common/types/request.js';

@Controller('admin/users')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.userService.adminGetInfoMany(page, limit);
  }

  @Get(':user_id')
  adminGetOne(@Param('user_id') user_id: string) {
    return this.userService.adminGetOne(user_id);
  }

  @Patch(':user_id')
  update(
    @Body() body: AdminUpdateUserDto,
    @Param('user_id') user_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.userService.adminUpdateInfo({
      user_id,
      body,
      admin_id: requester.id,
    });
  }
}
