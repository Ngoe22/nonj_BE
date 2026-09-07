import { Controller, Get, Post, Body, Patch, Param, Req } from '@nestjs/common';
import { UserService } from './user.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserSettingDto } from './dto/update-setting.dto.js';
import request from 'supertest';
import type { JwtPayload } from '../_common/types/request.js';
import { RequestPayload } from '../_common/decorators/param/request_payload.decorator.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}




  @Get('/setting')
  getSetting(
    @RequestPayload() payload : JwtPayload
  ) {
    return this.userService.getSetting(payload.id);
  }




  @Patch('/setting')
  updateSetting(
    @Body() body: UpdateUserSettingDto ,
    @RequestPayload() payload : JwtPayload
) {
    return this.userService.updateSetting(payload.id, body);
  }

  // =======================================

  @Get('search/:user_name')
  getByUserName(@Param('user_name') user_name: string) {
    return this.userService.getWithSetting({ user_name });
  }

  // =======

  @Get('/me') //get own
  get(
    @RequestPayload() payload : JwtPayload
  ) {
    const user_id = payload.id;
    return this.userService.getWithSetting({ id : user_id });
  }


  @Post('/create')
  create(body: CreateUserDto) {
    return this.userService.create(body);
  }

  @Patch('/update')
  update(
    @Body() body: UpdateUserDto ,
    @RequestPayload()  payload : JwtPayload
  ) {
    return this.userService.updateInfo(payload.id, body);
  }

  // other
}
