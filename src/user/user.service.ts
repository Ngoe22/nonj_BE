import {
  Body,
  ForbiddenException,
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
import { UpdateUserSettingDto } from './dto/update-setting.dto.js';
import { projectBcrypt } from '../_common/helper/customBcrypt.js';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
  ) {


  }

  static roleAndData = {
    id : [ 'other' , 'me' , 'admin' ] ,
    user_name :  [ 'other' , 'me' , 'admin' ] ,
    email :  [ 'me' , 'admin' ] ,
  }





  // private querySelect () {
  //
  //
  //   const fields = Object.entries(select)
  //     .filter(([_, value]) => value)
  //     .map(([key]) => `user.${key}`);
  // }


  async searchUser(condition: object)  {
     const user = await this.userRepository.findOne({ where: condition });
  };

  async get(condition: object) {
    return await this.userRepository.findOne({ where: condition });
  }

  async getWithSetting(condition: object) {
    const user: any = await this.userRepository.findOne({
      where: condition,
      relations: { setting: true }
    });
    const { setting, ...info } = user ;
    return { info: user, setting };
  }

  @Transactional()
  async create( body: CreateUserDto) {
    body.password = await projectBcrypt.encode(body.password);
    const user = await this.userRepository.save(body);
    const setting = await this.userSettingRepository.save({
      user: { id: user.id },
      created_by: user.id,
    });
    return { info: user , setting };
  }

  async updateInfo(
    id :string ,
    body: UpdateUserDto
  ) {
    const result = await this.userRepository.update({ id }, body);
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'user_not_found' });
    return body;
  }


  // ========================= Setting =========================

  async getSetting(user_id: string) {
    return await this.userSettingRepository.findOne({
      where: { user: { id: user_id } },
    });
  }

  async updateSetting( user_id :string ,body: UpdateUserSettingDto) {
    const result = await this.userSettingRepository.update(
      { user: { id: user_id } },
      body,
    );
    if (result.affected === 0)
      throw new ForbiddenException({ errorCode: 'no_authorized' });
    return body;
  }
}









