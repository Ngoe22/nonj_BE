import {Controller, Get, Post, Body, Patch, Param, Delete, Headers, BadRequestException} from '@nestjs/common';
import { UserService } from './user.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // me

  @Get('/me')
  getUserOwn() {
    return this.userService.get();
  }

  @Post('/create')
  create(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }

  @Patch('/update')
  update(@Body() body: UpdateUserDto) {
    return this.userService.update(body);
  }

  // other

  @Get('/:user_name')
  getUserByUserName(@Param('user_name') user_name: string) {
    return this.userService.getByUserName(user_name);
  }
}
