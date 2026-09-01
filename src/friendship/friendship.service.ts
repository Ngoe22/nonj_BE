import { Injectable } from '@nestjs/common';
import { CreateFriendshipDto } from './dto/create-friendship.dto.js';
import { UpdateFriendshipDto } from './dto/update-friendship.dto.js';

@Injectable()
export class FriendshipService {
  create(createFriendshipDto: CreateFriendshipDto) {
    return 'This action adds a new friendship';
  }

  findAll() {
    return `This action returns all friendship`;
  }

  findOne(id: number) {
    return `This action returns a #${id} friendship`;
  }

  update(id: number, updateFriendshipDto: UpdateFriendshipDto) {
    return `This action updates a #${id} friendship`;
  }

  remove(id: number) {
    return `This action removes a #${id} friendship`;
  }
}
