import {Controller, Get, Post, Body, Patch, Param, Delete, Headers, BadRequestException} from '@nestjs/common';
import { UserService } from './user.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(
      @Body()  body : CreateUserDto
  ) {


      // throw new BadRequestException({
      //   message: "test",
      //   errorCode: "test too",
      //   filed: "testttttt"
      // });

      return this.userService.create(body);
  }

  @Get()
  findAll() {



    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
