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
import {FriendshipService} from "../friendship/friendship.service.js";

// ==========================================


@Injectable()
export class UserService {
  userFilterByRole: FilterDbField<User>;
  settingFilterByRole: FilterDbField<UserSetting>;

  constructor(
      @InjectDataSource()
      private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSetting)
    private readonly userSettingRepository: Repository<UserSetting>,
  ) {
    // ============================== Filter DB & QueryField

    this.userFilterByRole = new FilterDbField({
      keyAndLabels: {
        id: ['SA', 'me', 'friend', 'not_friend'],
        email: ['SA', 'friend', 'me'],
        user_name: ['SA', 'me', 'friend', 'not_friend'],
        nickname: ['SA', 'me', 'friend', 'not_friend'],
        bio: ['SA', 'me', 'friend', 'not_friend'],
        avatar_url: ['SA', 'me', 'friend', 'not_friend'],
        role: ['SA', 'me'],
        status: ['SA', 'me'],
      },
      dataBase: User,
      dataSource: this.dataSource,
    });

    this.settingFilterByRole = new FilterDbField({
      keyAndLabels: {
        who_can_see_my_template: ['SA', 'me' ,  'friend','not_friend'],
      },
      dataBase: UserSetting ,
      dataSource : this.dataSource

    });

    // ==============================
  }



  private async checkPermissionBeforeGetOthersInfo (
      input : { requester_id :string , search_target_id ?: string , search_target_username ?: string }
  ) {

  }

  // ==============================


  async creatUser ( body : CreateUserDto ) {
     const result= await this.userRepository.save(body);
     return this.userFilterByRole.filterDataOfQueryResult({ object : result , label:'me' });

  }

  // ==============================

  async getInfoForEmailLogin( email : string ) {
    const selectField = this.userFilterByRole.buildQuerySelectObject({
      label: 'me',
    });
    return await this.userRepository.findOne({
      where: { email: email },
      select: {
        ...selectField,
        password :  true
      },
    });
  }

  //

  // =============== SEARCH =====================

  async getOtherInfoByUserName(input: { requester_id: string; search_target_username: string }) {
    return this.getOtherInfo({
      requester_id: input.requester_id,
      condition: { username: input.search_target_username },
    });
  }

  async getOtherInfoById(input: { requester_id: string; search_target_id: string }) {
    return this.getOtherInfo({
      requester_id: input.requester_id,
      condition: { id: input.search_target_id },
    });
  }

  private async getOtherInfo(input: { requester_id: string; condition: { id?: string; username?: string } }) {
    const { requester_id, condition } = input;

    const qb = this.userRepository
        .createQueryBuilder('u')
        .leftJoin(
            'friendship', 'f',
            'f.user_id = :requester_id AND f.friend_id = u.id AND f.deleted_at IS NULL',
            { requester_id },
        )
        .addSelect('CASE WHEN f.id IS NOT NULL THEN true ELSE false END', 'is_friend');

    if (condition.id) qb.where('u.id = :id', { id: condition.id });
    if (condition.username) qb.where('u.user_name = :username', { username: condition.username });
    const user = await qb.getRawOne();

    if (!user) throw new NotFoundException({ errorCode: 'user_not_found' });

    const isFriend = user.is_friend === 'true';
    const label = isFriend ? 'friend' : 'not_friend'
    const output = this.userFilterByRole.filterDataOfQueryResult( {object : user , label } );
    output.is_firend = isFriend

    return output
  }

  async getMyInfo( user_id : string ) {

    const role = 'me'
    const selectField = this.userFilterByRole.buildQuerySelectObject({ label: role });
    const user =  await this.userRepository.findOne({
      where: { id : user_id },
      select: selectField,
    });
    if (!user) return new NotFoundException({ error: 'user_not_found' });
    return user;
  }


  // ----------------- Create -----------------

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

  // ----------------- Update -----------------

  async updateInfo( input: { user_id : string, body: UpdateUserDto } ) {
    const { user_id , body } = input;

    if ( body.password ) body.password = await projectBcrypt.encode(body.password);
    const result = await this.userRepository.update( { id : user_id } , body);
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'update_setting_failed' });
    return body;
  }

  // ========================= Setting =========================

  async getSetting(id: string, role: 'SA' | 'me' ) {
    const selectField = this.userFilterByRole.buildQuerySelectObject({
      label: role,
    });
    return await this.userSettingRepository.findOne({
      where: { user: { id }} ,
      select : selectField
    })
  }

  async updateSetting(user_id: string, body: UpdateUserSettingDto) {
    const result = await this.userSettingRepository.update(
      { user: { id: user_id } },
      body,
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'update_setting_no_affected' });
    return body;
  }


  // =======================================================
  //                       ADMIN
  // =======================================================


  adminGetOne ( user_id : string ) {
    const select = this.userFilterByRole.buildQuerySelectObject({label:'SA'})
    return this.userRepository.findOne({
      where: {id  : user_id },
      select
    })
  }

  async adminGetInfoMany(
      page = 1,
      limit = 20,
  ) {
    const selectField = this.userFilterByRole.buildQuerySelectObject({ label: 'SA' });

    return await this.userRepository.find({
      where: {},
      select: selectField,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async adminUpdateInfo( input: { user_id : string, body: UpdateUserDto } ) {
    const { user_id , body } = input;

    if ( body.password ) body.password = await projectBcrypt.encode(body.password);
    const result = await this.userRepository.update( { id : user_id } , body);
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'update_setting_failed' });
    return body;
  }


  // ================= Setting =========================

  async adminGetSetting(id: string) {
    const selectField = this.userFilterByRole.buildQuerySelectObject({
      label: "SA",
    });
    return await this.userSettingRepository.findOne({
      where: { user: { id }} ,
      select : selectField
    })
  }

  async adminUpdateSetting(user_id: string, body: UpdateUserSettingDto) {
    const result = await this.userSettingRepository.update(
        { user: { id: user_id } },
        body,
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'update_setting_no_affected' });
    return body;
  }



}









