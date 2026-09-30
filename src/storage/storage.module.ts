import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageController } from './storage.controller.js';
import r2Config from '../_common/config/r2.config.js';
import { R2Service } from './r2.service.js';



@Module({
  imports: [ConfigModule.forFeature(r2Config)],
  controllers: [StorageController],
  providers: [R2Service],
  exports: [R2Service],
})
export class StorageModule {}
