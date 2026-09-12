import { Group } from '../../entities/group.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { GroupMemberService } from '../group_member/group_member.service.js';
import { FilterDbField } from '../../../_common/helper/filterQueryForRole.js';
import { CreateGroupDto, UpdateGroupDto } from '../../dto/group.dto.js';
import { Transactional } from 'typeorm-transactional';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Group_Member_Role, Group_View_Mode } from '../../enum/group.enum.js';

//====================================================================

@Injectable()
export class GroupService {
  private filterByRoles: FilterDbField<Group>;

  constructor(
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    private readonly groupMemberService: GroupMemberService,
  ) {
    this.filterByRoles = new FilterDbField({
      keyAndLabels: {
        id: ['member', 'unjoin', 'admin', 'founder', 'setting'],
        founder: ['member', 'admin', 'founder'],
        slug: ['member', 'unjoin', 'admin', 'founder'],
        name: ['member', 'unjoin', 'admin', 'founder'],
        description: ['member', 'unjoin', 'admin', 'founder'],
        join_mode: ['member', 'unjoin', 'admin', 'founder', 'setting'],
        view_mode: ['member', 'unjoin', 'admin', 'founder', 'setting'],
        created_at: ['member', 'admin', 'founder'],
      },
      dataBase: Group,
    });
  }

  // private

  private async findOne(
    where: any,
    label: 'founder' | 'admin' | 'member' | 'unjoin',
  ) {
    const select = this.filterByRoles.buildQuerySelectObject({ label });
    const group = await this.groupRepo.findOne({ where, select });
    if (!group) throw new NotFoundException({ errorCode: 'group_not_found' });
    return this.filterByRoles.filterDataOfQueryResult({ object: group, label });
  }

  private async findMany(input: {
    where: any;
    label: 'founder' | 'admin' | 'member' | 'unjoin';
    limit: number;
    page: number;
  }) {
    const { where, label, limit, page } = input;

    const select = this.filterByRoles.buildQuerySelectObject({ label });

    return await this.groupRepo.find({
      where,
      select,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  // ==================== Helper ====================

  async getSetting ( group_id: string ) {
    const select = this.filterByRoles.buildQuerySelectObject({ label:'setting' });

      const  result = await this.groupRepo.findOne({
        where: { id: group_id },
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

    return this.filterByRoles.filterDataOfQueryResult({
      object: group,
      label: 'member',
    });
  }

  // ==================== Read - One ====================

  async searchOneBySlug(input: {
    slug: string;
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { slug, requester_id, page, limit } = input;

    const selectArray = this.filterByRoles.buildQuerySelectArray({
      label: 'unjoin',
      tableName: 'g',
    });

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
      .where('g.slug = :slug', { slug })
      .andWhere('g.deleted_at IS NULL')
      .skip((page - 1) * limit)
      .take(limit)
      .getRawOne();

    if (!result) throw new NotFoundException({ errorCode: 'group_not_found' });
    return result;
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

    const selectArray = this.filterByRoles.buildQuerySelectArray({
      label: 'unjoin',
      tableName: 'g',
    });

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
      .skip((page - 1) * limit)
      .take(limit)
      .getRawMany();
    // if false return []
  }

  // personal

  async findMyOwnMany(input: {
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { requester_id, page, limit } = input;

    return this.findMany({
      where: { founder: { id: requester_id } },
      label: 'founder',
      page,
      limit,
    });
  }

  async findManyJoined(input: {
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { requester_id, page, limit } = input;

    return this.findMany({
      where: {
        group_member: { user: { id: requester_id }, deleted_at: IsNull() },
      },
      label: 'member',
      page,
      limit,
    });
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
    return this.findOne({ id: group_id }, 'founder');
  }

  async adminFindMany(input: { page: number; limit: number }) {
    const { page, limit } = input;

    return this.findMany({
      where: {},
      label: 'founder',
      page,
      limit,
    });
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
