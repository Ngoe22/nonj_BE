import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from './app_config.entity.js';
import { AppConfigService } from './app_config.service.js';
import { AppConfigController } from './app_config.controller.js';
import { ConfigPublicController } from './config_public.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([AppConfig])],
  controllers: [AppConfigController, ConfigPublicController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
