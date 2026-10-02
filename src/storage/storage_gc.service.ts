import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { StorageRefService } from './storage_ref.service.js';

/**
 * Cron dọn object mồ côi trên R2.
 *
 * - Hằng ngày 4h sáng: xoá object `ref_count == 0` đã quá 7 ngày.
 * - Ngày 1 mỗi tháng 5h sáng: mark-and-sweep — tính lại `ref_count` từ DB để
 *   tự sửa mọi lệch số do quên tăng/giảm ở một chỗ nào đó.
 */
@Injectable()
export class StorageGcService {
  private readonly logger = new Logger(StorageGcService.name);

  constructor(private readonly storageRef: StorageRefService) {}

  @Cron('0 4 * * *', { name: 'storage-gc-daily' })
  async handleDailyGc() {
    const deleted = await this.storageRef.collectGarbage(7);
    if (deleted > 0) {
      this.logger.log(`Đã xoá ${deleted} object mồ côi trên R2`);
    }
  }

  @Cron('0 5 1 * *', { name: 'storage-recount-monthly' })
  async handleMonthlyRecount() {
    const fixed = await this.storageRef.recountAll();
    this.logger.log(`Mark-and-sweep: đã sửa lại ref_count cho ${fixed} object`);
  }
}
