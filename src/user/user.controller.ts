import {Controller, Get, Post, Body, Patch, Param, Delete, Headers, BadRequestException} from '@nestjs/common';
import { UserService } from './user.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/register')
  create(@Body() body: CreateUserDto) {
    return this.userService.create(body);
  }

  @Get('/:user_name')
  getUserByUserName(@Param('user_name') user_name: string) {
    return this.userService.getUserById(user_name);
  }
}
