import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageController } from './storage.controller.js';
import r2Config from '../_common/config/r2.config.js';
import { R2Service } from './r2.service.js';
import { StorageObject } from './entities/storage_object.entity.js';
import { StorageRefService } from './storage_ref.service.js';
import { StorageGcService } from './storage_gc.service.js';
import { StorageAdminController } from './storage_admin.controller.js';

@Module({
  imports: [ConfigModule.forFeature(r2Config), TypeOrmModule.forFeature([StorageObject])],
  controllers: [StorageController, StorageAdminController],
  providers: [R2Service, StorageRefService, StorageGcService],
  exports: [R2Service, StorageRefService],
})
export class StorageModule {}
