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

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
  ) {
    // const [userKeys, settingKeys] = [
    //   this.userRepository,
    //   this.userSettingRepository,
    // ].map((repo) => repo.metadata.columns.map((col) => col.propertyName));
    //
    //

    const creatSet = (array: string[]) => new Set<string>(array);

    const userField = {
      id: creatSet(['admin' , 'me' ]),
      email: creatSet(['admin' , 'me' ]),
      user_name: creatSet(['admin' , 'me' , 'other']),
      nickname: creatSet(['admin' , 'me' , 'other']),
      bio: creatSet(['admin' , 'me' , 'other']),
      avatar_url: creatSet(['admin' , 'me' , 'other']),
      status: creatSet(['admin' , 'me' , 'other']),
    };


    const settingField = ['who_can_see_my_template'];

     // const who_request = {
     //   admin :
     // }
  }


  /// who_request : admin , me , other
  // field

  // me

  @Transactional()
  async create(@Body() body: CreateUserDto) {
    const user = await this.userRepository.save(body);
    const setting = await this.userSettingRepository.save({
      user: { id: user.id },
      created_by: user.id,
    });
    // return this.filterReturnInfo();
  }

/// done
  async updateInfo(@Body() body: UpdateUserDto) {
    // getUserID form token auth user  -- if pass
    const id = '3457b0eb-1e7b-4bf5-9a26-bbe0a10b7951'; // fake data
    const result = await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set(body)
      .where('id = :id', { id })
      .execute();
    return body;
  }

  async get(condition: object) {
    return await this.userRepository.findOne({ where: condition });
  }


  async getWithSetting(condition: object) {
    const user: any = await this.userRepository.findOne({
      where: condition,
      relations: { setting: true },
    });
    const { setting, ...info } = user;

    // return this.filterReturnInfo({ info, setting }, 'other');
  }

  // share


  private filterObjectFromArrayKeys(objectInput: {}, keyArray: string[]) {
    const outPut: Record<string, any> = {};
    keyArray.forEach((key) => {
      const value = objectInput ? [key] : false;
      if (value) outPut[key] = value;
    });
    return outPut;
  }

  // ========================= Setting =========================

  async getSetting(
    // id: string
  ) {
    const id = '3457b0eb-1e7b-4bf5-9a26-bbe0a10b7951'; // fake data
    return await this.userSettingRepository.findOne({
      where: { user: { id: id } },
    });


  }

  async updateSetting(
    body: UpdateUserSettingDto ,
    settingID :string
  ) {

    const userid = '3457b0eb-1e7b-4bf5-9a26-bbe0a10b7951'; // fake data

    const result = await this.userSettingRepository.update(
      { id: settingID, user: { id: userid } }, // WHERE id = X AND user_id = Y
      body,
    );

    if (result.affected === 0) throw new ForbiddenException({ errorCode : "no_authorized" });
    return result;
  }
}









