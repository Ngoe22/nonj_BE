import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserGuard } from '../_other_module/guards/user.guard.js';
import { User_Role } from '../user/enums/user.enum.js';
import { AppConfigService } from './app_config.service.js';

interface UpdateConfigDto {
  key: string;
  value: string | number;
}

@Controller('admin/config')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AppConfigController {
  constructor(private readonly configService: AppConfigService) {}

  /** Admin đọc toàn bộ cấu hình */
  @Get()
  async getAll() {
    return this.configService.getAll();
  }

  /** Admin cập nhật 1 khoá cấu hình (nhận cả khoá số và khoá chuỗi) */
  @Patch()
  async update(@Body() body: UpdateConfigDto) {
    if (!body.key || body.value === undefined || body.value === null) {
      return { success: false, errorCode: 'invalid_config_payload' };
    }

    // `setValue` tự kiểm tra khoá hợp lệ + kiểu giá trị (số nguyên >= 0 cho khoá
    // số, chuỗi có giới hạn độ dài cho khoá chuỗi).
    const result = await this.configService.setValue(body.key, body.value);
    if (!result.ok) {
      return { success: false, errorCode: result.errorCode };
    }

    return { success: true, config: await this.configService.getAll() };
  }
}
