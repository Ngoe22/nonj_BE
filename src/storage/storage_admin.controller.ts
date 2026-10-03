import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { UserGuard } from '../_other_module/guards/user.guard.js';
import { User_Role } from '../user/enums/user.enum.js';
import { StorageRefService } from './storage_ref.service.js';

/**
 * Công cụ quản trị kho R2.
 *
 * Tách thành file RIÊNG (không gộp vào `storage.controller.ts`) vì checker
 * `check_api_contract.py` chỉ đọc `@Controller` ĐẦU TIÊN trong mỗi file — gộp
 * lại sẽ làm route của controller thứ hai không được kiểm tra.
 *
 * Toàn bộ route ở đây đều yêu cầu SYSTEM_ADMIN.
 */
@Controller('admin/storage')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class StorageAdminController {
  constructor(private readonly storageRef: StorageRefService) {}

  /**
   * Danh sách object trong kho R2 (phân trang).
   *
   * `only_orphans=true` -> chỉ hiện object `ref_count = 0` (rác chờ cron dọn).
   */
  @Get('objects')
  async listObjects(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('only_orphans') onlyOrphans?: string,
  ) {
    return this.storageRef.listObjects({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      onlyOrphans: onlyOrphans === 'true',
    });
  }

  /**
   * Chạy dọn rác NGAY (không phải chờ cron 4h sáng).
   *
   * Dùng CÙNG logic với cron (`collectGarbage`) nên an toàn như nhau: chỉ xoá
   * object `ref_count = 0` VÀ đã quá `graceDays` ngày, kèm lưới an toàn xác minh
   * lại số tham chiếu từ DB trước khi xoá.
   *
   * `graceDays = 0` -> dọn sạch mọi object mồ côi bất kể tuổi (dùng để kiểm
   * chứng cron hoạt động, hoặc khi muốn giải phóng dung lượng ngay).
   */
  @Post('gc')
  async runGcNow(@Body() body: { graceDays?: number }) {
    const raw = Number(body?.graceDays);
    const graceDays = Number.isFinite(raw)
      ? Math.min(365, Math.max(0, Math.floor(raw)))
      : 7;

    const deleted = await this.storageRef.collectGarbage(graceDays);
    return { deleted, graceDays };
  }
}
