import {
  Body,
  Get,
  Injectable,
  NotFoundException,
  Param,
} from '@nestjs/common';
import {CreateUserDto} from './dto/create-user.dto.js';
import {UpdateUserDto} from './dto/update-user.dto.js';
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {User} from "./entities/user.entity.js";
import { Transactional } from 'typeorm-transactional';
import { UserSetting } from './entities/user_setting.entity.js';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
  ) {}

  @Transactional()
  async create(@Body() body: CreateUserDto) {

    // throw new NotFoundException( {message: 'User already exists'} );

    const user = await this.userRepository.save(body);
    const setting = await this.userSettingRepository.save({
      user : {id : user.id},
      created_by: user.id,
    });

    return   {
      id : user.id ,
      user_name  : user.user_name ,
      nickname : user.nickname ,
      avatar_url: user.avatar_url,
      bio : user.bio,
      setting : {
        who_can_see_my_template : setting.who_can_see_my_template
      }
    } ;

  }

    async getUserById(user_name: string) {
      const data = await this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.setting', 'setting')
        .select([
          'user.user_name',
          'user.nickname',
          'user.bio',
          'user.avatar_url',
          'setting.who_can_see_my_template',
        ])
        .where('user.user_name = :user_name', { user_name })
        .getOne();
      // console.log(data);

      return data;
    }
}



