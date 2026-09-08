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
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import {User} from "./entities/user.entity.js";
import { Transactional } from 'typeorm-transactional';
import { UserSetting } from './entities/user_setting.entity.js';
import { UpdateUserSettingDto } from './dto/update-setting.dto.js';
import { projectBcrypt } from '../_common/helper/customBcrypt.js';
import { FilterDbField } from '../_common/helper/filterQueryForRole.js';

// ==========================================


@Injectable()
export class UserService {
  private userFilterByRole: FilterDbField<User>;
  private settingFilterByRole: FilterDbField<UserSetting>;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    // ============================== Filter DB & QueryField

    this.userFilterByRole = new FilterDbField({
      keyAndLabels: {
        id: ['admin', 'me', 'other'],
        email: ['admin', 'me'],
        user_name: ['admin', 'me', 'other'],
        nickname: ['admin', 'me', 'other'],
        bio: ['admin', 'me', 'other'],
        avatar_url: ['admin', 'me', 'other'],
        status: ['admin'],
      },
      dataBase: User,
      dataSource,
    });

    this.settingFilterByRole = new FilterDbField({
      keyAndLabels: {
        who_can_see_my_template: ['admin', 'me'],
      },
      dataBase: UserSetting,
      dataSource,
    });

    // ==============================
  }

  async getFullInfoOfOne(condition: FindOptionsWhere<User>) {
    return await this.userRepository.findOne({ where: condition });
  }

  async getInfo(
    condition: FindOptionsWhere<User>,
    role: 'admin' | 'me' | 'other',
  ) {
    const alias = 'user';
    const selectField = this.userFilterByRole.getQuerySelectArray({
      label: role,
      tableName: alias,
    });
    return await this.userRepository
      .createQueryBuilder(alias)
      .where(condition)
      .select(selectField)
      .getRawOne();
  }

  async getInfoMany(
    condition: FindOptionsWhere<User>,
    role: 'admin' | 'me' | 'other',
    page = 1,
    limit = 20,
  ) {
    const alias = 'user';
    const selectField = this.userFilterByRole.getQuerySelectArray({
      label: role,
      tableName: alias,
    });
    return await this.userRepository
      .createQueryBuilder(alias)
      .where(condition)
      .select(selectField)
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getRawMany();
  }

  @Transactional()
  async create(body: CreateUserDto) {
    const label = 'me';

    body.password = await projectBcrypt.encode(body.password);
    const user = await this.userRepository.save(body);
    const setting = await this.userSettingRepository.save({
      user: { id: user.id },
      created_by: user.id,
    });

    return {
      info: this.userFilterByRole.filterDataOfQueryResult({
        object: user,
        label,
      }),
      setting: this.settingFilterByRole.filterDataOfQueryResult({
        object: setting,
        label,
      }),
    };
  }

  async updateInfo(condition: FindOptionsWhere<User>, body: UpdateUserDto) {
    const result = await this.userRepository.update(condition, body);
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'update_setting_failed' });
    return body;
  }

  // ========================= Setting =========================

  async getSetting(id: string, role: 'admin' | 'me' | 'other') {
    const alias = 'user';
    const selectField = this.userFilterByRole.getQuerySelectArray({
      label: role,
      tableName: alias,
    });
    return await this.userRepository
      .createQueryBuilder(alias)
      .where({ user: { id } })
      .select(selectField)
      .getRawOne();
  }

  async updateSetting(user_id: string, body: UpdateUserSettingDto) {
    const result = await this.userSettingRepository.update(
      { user: { id: user_id } },
      body,
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'update_setting_failed' });
    return body;
  }
}









