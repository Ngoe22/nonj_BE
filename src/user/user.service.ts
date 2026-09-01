import {Body, Injectable} from '@nestjs/common';
import {CreateUserDto} from './dto/create-user.dto.js';
import {UpdateUserDto} from './dto/update-user.dto.js';
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {User} from "./entities/user.entity.js";

@Injectable()
export class UserService {

  constructor(
      @InjectRepository(User)
      private readonly userRepository: Repository<User>,
  ) {
  }

  async create( @Body() body :CreateUserDto ) {

    return await this.userRepository.save(body);
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
