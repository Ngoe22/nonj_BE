import {Group} from '../../entities/group.entity.js';
import {InjectDataSource, InjectRepository} from '@nestjs/typeorm';
import {DataSource, IsNull, Repository} from 'typeorm';
import {GroupMemberService} from '../group_member/group_member.service.js';
import {FilterDbField} from '../../../_common/helper/filterQueryForRole.js';
import {CreateGroupDto, UpdateGroupDto} from '../../dto/group.dto.js';
import {Transactional} from 'typeorm-transactional';
import {Injectable, NotFoundException} from '@nestjs/common';
import {User} from "../../../user/entities/user.entity.js";
import {GroupMember} from "../../entities/group_member.entity.js";

//====================================================================

@Injectable()
export class GroupService {
  private filterByLabels: FilterDbField<Group | User, string>;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    private readonly groupMemberService: GroupMemberService,
  ) {
    this.filterByLabels =  FilterDbField.create({
      labels : [ 'SA' , 'founder' , 'admin' , 'member' , 'unjoin' , 'setting' ]     ,
      fieldAndLabels: {
        id: [  'SA' , 'member', 'unjoin', 'admin', 'founder', 'setting'],
        founder: {
          id : ['SA' ],
          nickname : ['SA'],
          user_name : ['SA' ],
          avatar_url : []
        },
        slug: ['SA' ,'member', 'unjoin', 'admin', 'founder'],
        name: ['SA' ,'member', 'unjoin', 'admin', 'founder'],
        description: ['SA' ,'member', 'unjoin', 'admin', 'founder'],
        join_mode: ['SA' ,'member', 'unjoin', 'admin', 'founder', 'setting'],
        view_mode: ['SA' ,'member', 'unjoin', 'admin', 'founder', 'setting'],
        created_at: ['SA' ,'member', 'admin', 'founder' , 'member'],
        group_member : {
          role : ['member', 'admin', 'founder' ]
        },

      },
      dataBases: {
        _main : Group,
        founder : User ,
        group_member : GroupMember
      },
      dataSource : this.dataSource ,
      FE_permission : {
        view_setting: [ 'founder' ],
        view_join_req : [ 'founder' ],
        view_member : [ 'founder' ,'admin' ],
        edit_setting: [ 'founder' ],
        able_to_leave : [ 'member' ,'admin' ],
        able_to_delete : [ 'founder' ],
      }
    });
  }

  // private

  private async findOne(
    where: any,
    label: 'founder' | 'admin' | 'member' | 'unjoin',
  ) {
    const { relations , select } = this.filterByLabels.buildQueryObject({ label });
    const group = await this.groupRepo.findOne({
      where,
      relations,
      select,
    });
    if (!group) throw new NotFoundException({ errorCode: 'group_not_found' });
    return this.filterByLabels.filterDataOfQueryResult({ object: group, label });
  }

  private async findMany(input: {
    where: any;
    label: 'founder' | 'admin' | 'member' | 'unjoin';
    limit: number;
    page: number;
  }) {
    const { where, label, limit, page } = input;
    const {select , relations} = this.filterByLabels.buildQueryObject({ label });

    return await this.groupRepo.find({
      where,
      relations,
      select,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  // ==================== Helper ====================

  async getSetting ( group_id: string ) {
    const {select , relations} = this.filterByLabels.buildQueryObject({ label:'setting' });

      const  result = await this.groupRepo.findOne({
        where: { id: group_id },
        relations ,
        select,
      });

    if (!result) throw new NotFoundException({ errorCode: 'group_not_found' });
    return result;
  }



  // ==================== Create ====================

  @Transactional()
  async create(input: { founder_id: string; body: CreateGroupDto }) {
    const { founder_id, body } = input;

    const group = await this.groupRepo.save({
      ...body,
      founder: { id: founder_id },
    });

    await this.groupMemberService.addFounder({
      group_id: group.id,
      user_id: founder_id,
    });

    return this.filterByLabels.filterDataOfQueryResult({
      object: group,
      label: 'founder',
    });
  }

  // ==================== Read - One ====================

  async searchOneBySlug(input: {
    slug: string;
    requester_id: string;
  }) {
    const { slug, requester_id } = input;

    const selectArray = [
      'g.id AS g_id',
      'g.name AS g_name',
      'g.slug AS slug',
      'g.description AS description',
      'g.join_mode AS join_mode',
      'g.view_mode AS view_mode',
    ];

    const result = await this.groupRepo
      .createQueryBuilder('g')
      .leftJoin(
        'g.group_member',
        'gm',
        'gm.user_id = :requester_id AND gm.deleted_at IS NULL',
        { requester_id },
      )
      .select(selectArray)
      .addSelect(
        'CASE WHEN gm.id IS NOT NULL THEN true ELSE false END',
        'is_joined',
      )
      .addSelect('gm.role', 'role')
      .where('g.slug = :slug', { slug })
      .andWhere('g.deleted_at IS NULL')
      .getRawOne();

    if (!result) throw new NotFoundException({ errorCode: 'group_not_found' });
    return result;
  }

  async getOneById(input: {
    group_id: string;
    requester_id: string;
  }) {
    const { group_id, requester_id } = input;

    const selectArray = [
      'g.id AS id',          // ⬅️ đổi g_id → id
      'g.name AS name',      // ⬅️ đổi g_name → name
      'g.slug AS slug',
      'g.description AS description',
      'g.join_mode AS join_mode',
      'g.view_mode AS view_mode',
    ];

    const result = await this.groupRepo
        .createQueryBuilder('g')
        .leftJoin(
            'g.group_member',
            'gm',
            'gm.user_id = :requester_id AND gm.deleted_at IS NULL',
            { requester_id },
        )
        .select(selectArray)
        .addSelect(
            'CASE WHEN gm.id IS NOT NULL THEN true ELSE false END',
            'is_joined',
        )
        .addSelect('gm.role', 'role')
        .where('g.id = :group_id', { group_id })
        .andWhere('g.deleted_at IS NULL')
        .getRawOne();

    if (!result) throw new NotFoundException({ errorCode: 'group_not_found' });

    const role = (result.role ?? 'unjoin').toLowerCase();
    const permission = this.filterByLabels.getLabelPermission(role);
    const final_group = this.filterByLabels.filterDataOfQueryResult({
      object: result,
      label: role,
    });
    console.log(result)
    console.log(final_group)
    return { ...final_group , permission };
  }


  // ==================== Read - Many ====================

  //  Pending for optimize
  async searchManyByName(input: {
    name: string;
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { name, requester_id, page, limit } = input;


    const selectArray = [
      'g.id AS id',          // ⬅️ đổi g_id → id
      'g.name AS name',      // ⬅️ đổi g_name → name
      'g.slug AS slug',
      'g.description AS description',
      'g.join_mode AS join_mode',
      'g.view_mode AS view_mode',
    ];


    return this.groupRepo
        .createQueryBuilder('g')
        .leftJoin(
            'g.group_member',
            'gm',
            'gm.user_id = :requester_id AND gm.deleted_at IS NULL',
            { requester_id },
        )
        .select(selectArray)
        .addSelect(
            'CASE WHEN gm.id IS NOT NULL THEN true ELSE false END',
            'is_joined',
        )
        .where('g.name ILIKE :name', { name: `%${name}%` })
        .andWhere('g.deleted_at IS NULL')
        .orderBy('g.created_at', 'DESC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany();
  }

  // personal


  async findMyOwnMany(input: {
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { requester_id, page, limit } = input;

    const  { select , relations } = this.filterByLabels.buildQueryObject({ label:'founder' })
    const result = await this.groupRepo.find({
      where: { founder: { id: requester_id } },
      relations ,
      select ,
      skip: (page - 1) * limit,
      take: limit,
    });

    const permission = this.filterByLabels.getLabelPermission('founder')
    return result.map((group)=>  { return {...group , permission} } )

  }

  async findManyJoined(input: {
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { requester_id, page, limit } = input;

    const  { select , relations } = this.filterByLabels.buildQueryObject({ label:'founder' })
    const result = await this.groupRepo.find({
      where: { founder: { id: requester_id } },
      relations ,
      select ,
      skip: (page - 1) * limit,
      take: limit,
    });

    return result.map((group) => {

      const role = group.group_member.role
      const permission = this.filterByLabels.getLabelPermission(role)
      const final_group = this.filterByLabels.filterDataOfQueryResult({ object : group , label: role })
      return {...final_group, permission};
    })
  }

  // ==================== Update ====================

  async update(input: {
    group_id: string;
    founder_id: string;
    body: UpdateGroupDto;
  }) {
    const { group_id, founder_id, body } = input;

    const result = await this.groupRepo.update(
      { id: group_id, founder: { id: founder_id } },
      { ...body, updated_by: founder_id },
    );

    if (result.affected === 0) {
      throw new NotFoundException({ errorCode: 'group_or_founder_not_found' });
    }
    return true;
  }

  // ==================== Delete ====================

  async softDelete(input: { group_id: string; founder_id: string }) {
    const { group_id, founder_id } = input;

    const result = await this.groupRepo.update(
      { id: group_id, founder: { id: founder_id } },
      { deleted_at: new Date(), deleted_by: founder_id },
    );

    if (result.affected === 0) {
      throw new NotFoundException({ errorCode: 'group_or_founder_not_found' });
    }
    return true;
  }

  //   =========================================================================
  //                            ADMIN
  //   =========================================================================

  async adminFindById(group_id: string) {

    const  { select , relations } = this.filterByLabels.buildQueryObject({label : 'SA'})

    return this.groupRepo.findOne( {
      where: { id :  group_id },relations , select
    } );
  }

  async adminFindMany(input: { page: number; limit: number }) {

    const { page, limit } = input;
    const  { select , relations } = this.filterByLabels.buildQueryObject({label : 'SA'})


    return this.groupRepo.find( {
      where: {} ,
      relations ,
      select ,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    } );
  }

  async adminUpdate(input: {
    group_id: string;
    body: UpdateGroupDto;
    sysadmin_id: string;
  }) {
    const result = await this.groupRepo.update(
      { id: input.group_id },
      { ...input.body, updated_by: input.sysadmin_id },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'group_not_found' });
    return true;
  }

  async adminSoftDelete(input: { group_id: string; sysadmin_id: string }) {
    const { group_id, sysadmin_id } = input;
    const result = await this.groupRepo.update(
      { id: group_id },
      { deleted_at: new Date(), deleted_by: sysadmin_id },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'group_not_found' });
    return true;
  }
}


//////// =================================
// broken code
// const selectArray = this.filterByLabels.buildQuerySelectArray({
//   label: 'unjoin',
//   tableName: 'g',
// });
//
// return this.groupRepo
//   .createQueryBuilder('g')
//   .leftJoin(
//     'g.group_member',
//     'gm',
//     'gm.user_id = :requester_id AND gm.deleted_at IS NULL',
//     { requester_id },
//   )
//   .select(selectArray)
//   .addSelect(
//     'CASE WHEN gm.id IS NOT NULL THEN true ELSE false END',
//     'is_joined',
//   )
//   .where('g.name ILIKE :name', { name: `%${name}%` })
//   .andWhere('g.deleted_at IS NULL')
//   .skip((page - 1) * limit)
//   .take(limit)
//   .getRawMany();
// if false return []