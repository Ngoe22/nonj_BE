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
    return this.userService.getSetting();
  }

  @Get('')
  get() {

    // id = request.user.id
    return this.userService.getWithSetting({ id: '' });
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

  // ======================= Setting =======================

  @Patch('/setting/update/:id')
  updateSetting(
    @Body() body: UpdateUserSettingDto,
    @Param('id', new ParseUUIDPipe()) settingID: string,
  ) {
    return this.userService.updateSetting(body, settingID);
  }
}
