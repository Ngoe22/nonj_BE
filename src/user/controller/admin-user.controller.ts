import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { UserService } from '../user.service.js';
import { AdminUpdateUserDto } from '../dto/admin-update-user.dto.js';
import { AdminUserQueryDto } from '../dto/admin-user-query.dto.js';
import { UserGuard } from '../../_other_module/guards/user.guard.js';
import { User_Role } from '../enums/user.enum.js';
import { GetRequesterInfo } from '../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../_common/types/request.js';

@Controller('admin/users')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  /** Tìm kiếm người dùng: id / user_name / email / nickname / role / status /
   *  khoảng thời gian tạo / có lấy cả bản ghi đã xoá mềm hay không */
  @Get()
  findAll(@Query() query: AdminUserQueryDto) {
    return this.userService.adminFindMany(query);
  }

  @Get(':user_id')
  adminGetOne(@Param('user_id') user_id: string) {
    return this.userService.adminGetOne(user_id);
  }

  /** Khôi phục người dùng đã bị xoá mềm */
  @Patch(':user_id/restore')
  restore(@Param('user_id') user_id: string) {
    return this.userService.adminRestore(user_id);
  }

  /** Reset mật khẩu: sinh mật khẩu mới và GỬI QUA EMAIL (không trả về mật khẩu) */
  @Patch(':user_id/reset_password')
  resetPassword(@Param('user_id') user_id: string) {
    return this.userService.adminResetPassword(user_id);
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
