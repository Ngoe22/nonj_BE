import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from '../user.service.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { UpdateUserSettingDto } from '../dto/update-setting.dto.js';
import { UserGuard } from '../guard/user.guard.js';

@Controller('controller/users')
@UseGuards(UserGuard(['admin']))
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.userService.getInfoMany({}, 'admin', page, limit);
  }

  @Get(':user_id')
  findOne(@Param('user_id') user_id: string) {
    return this.userService.getInfo({ id: user_id }, 'admin');
  }

  @Patch(':user_id')
  update(@Body() body: UpdateUserDto, @Param('user_id') user_id: string) {
    return this.userService.updateInfo({ id: user_id }, body);
  }

  @Get(':user_id/setting')
  getSetting(@Param('user_id') user_id: string) {
    return this.userService.getSetting(user_id, 'admin');
  }

  @Patch(':user_id/setting')
  updateSetting(
    @Body() body: UpdateUserSettingDto,
    @Param('user_id') user_id: string,
  ) {
    return this.userService.updateSetting(user_id, body);
  }
}
