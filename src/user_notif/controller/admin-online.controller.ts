import { Controller, Get, UseGuards } from '@nestjs/common';

import { UserGuard } from '../../_other_module/guards/user.guard.js';
import { User_Role } from '../../user/enums/user.enum.js';
import { NotifGateway } from '../user_notif.gateway.js';

/**
 * Số người đang online — giá trị KHỞI TẠO cho dashboard.
 *
 * Sau đó dashboard cập nhật tiếp qua WebSocket (sự kiện `online_count`), không
 * phải polling.
 */
@Controller('admin/online')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminOnlineController {
  constructor(private readonly notifGateway: NotifGateway) {}

  @Get()
  getOnline() {
    return this.notifGateway.getOnlineCount();
  }
}
