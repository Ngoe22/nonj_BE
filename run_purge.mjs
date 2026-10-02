/**
 * Chạy thẳng cron dọn dẹp thay vì chờ tới 3h sáng.
 *   node run_purge.mjs          (dùng trong thư mục nonj_be)
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './dist/app.module.js';
import { DataPurgeService } from './dist/_common/purge/data_purge.service.js';

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: false,
});

const purge = app.get(DataPurgeService);
console.log('  giữ lại:', purge.retentionDays, 'ngày');

const report = await purge.purge();
const total = Object.values(report).reduce((a, b) => a + b, 0);

for (const [table, count] of Object.entries(report)) {
  console.log(`    ${table.padEnd(34)} ${count}`);
}
console.log(`  TỔNG ĐÃ XOÁ: ${total}`);

await app.close();
