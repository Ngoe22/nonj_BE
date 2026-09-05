import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserSettingDto } from './dto/update-setting.dto.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/setting')
  getSetting() {
    console.log(`meow`);
    return this.userService.getSetting('');
  }

  @Patch('/setting/update')
  updateSetting(@Body() body: UpdateUserSettingDto) {
    return this.userService.updateSetting(body);
  }

  // =======================================

  @Get('')
  get() {
    const id = '330aaf32-d978-4d74-9595-41a8c3cd3bb4';
    return this.userService.getWithSetting({ id });
  }

  @Get('/:user_name')
  getByUserName(@Param('user_name') user_name: string) {
    return this.userService.getWithSetting({ user_name });
  }

  @Post('/create')
  create(body: CreateUserDto) {
    return this.userService.create(body);
  }

  @Patch('/update')
  update(@Body() body: UpdateUserDto) {
    return this.userService.updateInfo(body);
  }

  // other

}
