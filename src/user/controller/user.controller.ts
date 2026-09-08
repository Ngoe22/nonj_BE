import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserService } from '../user.service.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { UpdateUserSettingDto } from '../dto/update-setting.dto.js';
import type { JwtPayload } from '../../_common/types/request.js';
import { RequestPayload } from '../../_common/decorators/param/request_payload.decorator.js';
import { Public } from '../../_common/decorators/public.decorator.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ==================== Public ====================

  // @Post()
  // register(@Body() body: CreateUserDto) {
  //   return this.userService.create(body);
  // }

  @Get(':user_name')
  findByUsername(@Param('user_name') user_name: string) {
    console.log('here');
    return this.userService.getInfo({ user_name }, 'other');
  }

  // ==================== Current user (me) ====================

  @Get('me')
  getProfile(@RequestPayload() payload: JwtPayload) {
    return this.userService.getInfo({ id: payload.id }, 'me');
  }

  @Patch('me')
  updateProfile(
    @Body() body: UpdateUserDto,
    @RequestPayload() payload: JwtPayload,
  ) {
    return this.userService.updateInfo({ id: payload.id }, body);
  }

  @Get('me/setting')
  getMySetting(@RequestPayload() payload: JwtPayload) {
    return this.userService.getSetting(payload.id, 'me');
  }

  @Patch('me/setting')
  updateMySetting(
    @Body() body: UpdateUserSettingDto,
    @RequestPayload() payload: JwtPayload,
  ) {
    return this.userService.updateSetting(payload.id, body);
  }
}


















