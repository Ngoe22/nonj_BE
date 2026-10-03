import { Controller, Get } from '@nestjs/common';
import { Public } from '../_common/decorators/method/public.decorator.js';
import { AppConfigService } from './app_config.service.js';

/**
 */
@Controller('config')
export class ConfigPublicController {
  constructor(private readonly configService: AppConfigService) {}

  @Public()
  @Get()
  async getPublicConfig() {
    return this.configService.getPublicConfig();
  }
}
