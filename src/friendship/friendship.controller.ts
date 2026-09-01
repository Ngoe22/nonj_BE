import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FriendshipService } from './friendship.service.js';
import { CreateFriendshipDto } from './dto/create-friendship.dto.js';
import { UpdateFriendshipDto } from './dto/update-friendship.dto.js';

@Controller('friendship')
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Post()
  create(@Body() createFriendshipDto: CreateFriendshipDto) {
    return this.friendshipService.create(createFriendshipDto);
  }

  @Get()
  findAll() {
    return this.friendshipService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.friendshipService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFriendshipDto: UpdateFriendshipDto) {
    return this.friendshipService.update(+id, updateFriendshipDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.friendshipService.remove(+id);
  }
}
