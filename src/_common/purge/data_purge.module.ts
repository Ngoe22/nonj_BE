import { Module } from '@nestjs/common';

import { DataPurgeService } from './data_purge.service.js';

/**
 */
@Module({
  providers: [DataPurgeService],
  exports: [DataPurgeService],
})
export class DataPurgeModule {}
