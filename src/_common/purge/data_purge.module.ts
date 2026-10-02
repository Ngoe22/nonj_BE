import { Module } from '@nestjs/common';

import { DataPurgeService } from './data_purge.service.js';

/**
 * Dọn dẹp dữ liệu xoá mềm quá hạn.
 *
 * Chỉ export service để script test gọi được `purge()` trực tiếp, không phải
 * chờ tới 3h sáng.
 */
@Module({
  providers: [DataPurgeService],
  exports: [DataPurgeService],
})
export class DataPurgeModule {}
