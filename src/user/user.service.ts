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
  ) {}

  private createSet(array: string[]): Set<string> {
    return new Set<string>(array);
  }



  async searchUser(condition: object)  {
     const user = await this.userRepository.findOne({ where: condition });
      if (user?.status === "BANNED")
        throw new NotFoundException( {
          errorCode: 'banned_account',
        } );

  };

  async get(condition: object) {
    return await this.userRepository.findOne({ where: condition });
  }

  async getWithSetting(condition: object) {
    const user: any = await this.userRepository.findOne({
      where: condition,
      relations: { setting: true },
    });
    const { setting, ...info } = user;

    return { info: user, setting };

  }

  @Transactional()
  async create(@Body() body: CreateUserDto) {

    body.password = await projectBcrypt.encode(body.password);

    const user = await this.userRepository.save(body);
    const setting = await this.userSettingRepository.save({
      user: { id: user.id },
      created_by: user.id,
    });
    return { info: user , setting };
  }

  async updateInfo(@Body() body: UpdateUserDto) {
    // getUserID form token auth user  -- if pass
    const id = '3457b0eb-1e7b-4bf5-9a26-bbe0a10b7951'; // fake data
    const result = await this.userRepository.update({ id }, body);
    if (result.affected === 0)
      throw new ForbiddenException({ errorCode: 'no_authorized' });
    return body;
  }

  // share



  // ========================= Setting =========================

  async getSetting(id: string) {
    return await this.userSettingRepository.findOne({
      where: { user: { id: id } },
    });
  }

  async updateSetting(body: UpdateUserSettingDto) {
    const userid = '3457b0eb-1e7b-4bf5-9a26-bbe0a10b7951'; // fake data
    const result = await this.userSettingRepository.update(
      { user: { id: userid } },
      body,
    );
    if (result.affected === 0)
      throw new ForbiddenException({ errorCode: 'no_authorized' });
    return body;
  }
}









