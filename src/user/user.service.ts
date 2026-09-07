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
import { FindOptionsWhere, Repository } from 'typeorm';
import {User} from "./entities/user.entity.js";
import { Transactional } from 'typeorm-transactional';
import { UserSetting } from './entities/user_setting.entity.js';
import { UpdateUserSettingDto } from './dto/update-setting.dto.js';
import { projectBcrypt } from '../_common/helper/customBcrypt.js';
import { filterDbField } from '../_common/helper/filterQueryForRole.js';

@Injectable()
export class UserService {
  private userFilterControl: filterDbField;
  private userSettingFilterControl: filterDbField;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
  ) {
    this.userFilterControl = new filterDbField({
      id: ['admin', 'me', 'other'],
      email: ['admin', 'me'],
      user_name: ['admin', 'me', 'other'],
      nickname: ['admin', 'me', 'other'],
      bio: ['admin', 'me', 'other'],
      avatar_url: ['admin', 'me', 'other'],
    });

    this.userSettingFilterControl = new filterDbField({
      who_can_see_my_template: ['admin', 'me'],
    });
  }

  getAllowField() {}

  async getAllInfo(condition: FindOptionsWhere<User>) {
    return await this.userRepository.findOne({ where: condition });
  }

    async get(condition: FindOptionsWhere<User>) {
      const selectField = this.userFilterControl.getQueryArray({
        label: 'other',
        tableName: 'user',
      });
      return this.userRepository
        .createQueryBuilder('user')
        .where(condition)
        .select(selectField)
        .getRawOne();
    }

  // async getWithSetting(condition: object) {
  //   const user: any = await this.userRepository.findOne({
  //     where: condition,
  //     relations: { setting: true }
  //   });
  //   const { setting, ...info } = user ;
  //   return { info: user, setting };
  // }

  @Transactional()
  async create(body: CreateUserDto) {
    body.password = await projectBcrypt.encode(body.password);
    const user = await this.userRepository.save(body);
    const setting = await this.userSettingRepository.save({
      user: { id: user.id },
      created_by: user.id,
    });
    return { info: user, setting };
  }

  async updateInfo(id: string, body: UpdateUserDto) {
    const result = await this.userRepository.update({ id }, body);
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'user_not_found' });
    return body;
  }

  // ========================= Setting =========================

  async getSetting(user_name: string) {
    return await this.userSettingRepository.findOne({
      where: { user: { user_name } },
    });
  }

  async updateSetting(user_id: string, body: UpdateUserSettingDto) {
    const result = await this.userSettingRepository.update(
      { user: { id: user_id } },
      body,
    );
    if (result.affected === 0)
      throw new ForbiddenException({ errorCode: 'no_authorized' });
    return body;
  }
}









