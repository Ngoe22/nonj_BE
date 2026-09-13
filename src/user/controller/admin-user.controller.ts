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
import { UserGuard } from '../../_other_module/guards/user.guard.js';
import { User_Role } from '../enums/user.enum.js';

@Controller('admin/users')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminUserController {
  constructor(private readonly userService: UserService) {}




  @Get()
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 20) {
    return this.userService.adminGetInfoMany( page, limit);
  }

  @Get("/:user_id")
  adminGetOne(
      @Param('user_id') user_id: string
  ) {
    return this.userService.adminGetOne(user_id );
  }



  @Patch(':user_id')
  update(@Body() body: UpdateUserDto, @Param('user_id') user_id: string) {
    return this.userService.adminUpdateInfo({ user_id: user_id , body });
  }

  // =================== Setting ===================

  @Get(':user_id/setting')
  getSetting(@Param('user_id') user_id: string) {
    return this.userService.adminGetSetting(user_id);
  }

  @Patch(':user_id/setting')
  updateSetting(
    @Body() body: UpdateUserSettingDto,
    @Param('user_id') user_id: string,
  ) {
    return this.userService.adminUpdateSetting(user_id, body);
  }
}
