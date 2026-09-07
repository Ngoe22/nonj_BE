import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserSettingDto } from './dto/update-setting.dto.js';
import request from 'supertest';
import type { JwtPayload } from '../_common/types/request.js';
import { RequestPayload } from '../_common/decorators/param/request_payload.decorator.js';
import { UserGuard } from './guard/user.guard.js';
import { Public } from '../_common/decorators/public.decorator.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ======= setting ======

  @Get('/me/setting')
  getMySetting(
    @RequestPayload() payload: JwtPayload
  ) {
    return this.userService.getSetting(payload.user_name);
  }

  @Patch('/me/setting')
  updateMySetting(
    @Body() body: UpdateUserSettingDto,
    @RequestPayload() payload: JwtPayload,
  ) {
    return this.userService.updateSetting(payload.user_name, body);
  }

  @UseGuards(UserGuard(['admin']))
  @Patch('/:username/setting')
  updateOtherSetting(
    @Body() body: UpdateUserSettingDto,
    @Param('username') username: string,
  ) {
    return this.userService.updateSetting(username, body);
  }

  // =================== USER ====================

  @Public() // test
  @Get('search/:user_name')
  getByUserName(@Param('user_name') user_name: string) {
    return this.userService.get({ user_name });
  }

  // =======

  @Get('/me') //get own
  get(@RequestPayload() payload: JwtPayload) {
    const user_id = payload.id;
    return this.userService.get({ id: user_id });
  }


  @Public()
  @Post('/create')
  create( @Body() body: CreateUserDto) {
    return this.userService.create(body);
  }


  @Patch('/update')
  update(@Body() body: UpdateUserDto, @RequestPayload() payload: JwtPayload) {
    return this.userService.updateInfo(payload.id, body);
  }

  // other
}
