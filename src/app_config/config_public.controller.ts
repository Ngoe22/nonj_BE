import { Controller, Get } from '@nestjs/common';
import { Public } from '../_common/decorators/method/public.decorator.js';
import { AppConfigService } from './app_config.service.js';

/**
 * Endpoint CÔNG KHAI: cấu hình FE cần đọc mà không cần đăng nhập —
 * giới hạn ảnh/mp3 (để hiện "đã upload X/Y") + nội dung trang chủ do admin soạn.
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
