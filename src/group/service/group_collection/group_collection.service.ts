import {
  ForbiddenException,
  Injectable,
  NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import {
  CreateGroupCollectionDto,
  UpdateGroupCollectionDto,
} from '../../dto/group_collection.dto.js';
import { FilterDbField } from '../../../_common/helper/filterQueryForRole.js';
import { GroupCollection } from '../../entities/group_collection.entity.js';
import {InjectDataSource, InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import { GroupMemberService } from '../group_member/group_member.service.js';
import { Group_Member_Role, Group_View_Mode } from '../../enum/group.enum.js';
import { GroupService } from '../group/group.service.js';

@Injectable()
export class GroupCollectionService {
  private filterByRoles: FilterDbField<GroupCollection>;

  constructor(
      @InjectDataSource()
      private readonly dataSource: DataSource,
    @InjectRepository(GroupCollection)
    private readonly collectionRepo: Repository<GroupCollection>,
    //
    private readonly groupMemberService: GroupMemberService,
    private readonly groupService: GroupService,
  ) {

    //

    this.filterByRoles = new FilterDbField({
      keyAndLabels: {
        id: ['member', 'unjoin', 'admin' , 'founder'],
        title: ['member', 'unjoin', 'admin' , 'founder'],
        group: ['member', 'unjoin', 'admin' , 'founder'],
      },
      dataBase: GroupCollection,
      dataSource : this.dataSource
    });
  }

  // ==================== Check ====================

  async isCollectionBelongToGroup(input: { collection_id: string; group_id: string }): Promise<boolean> {
    return this.collectionRepo.exists({
      where: { id: input.collection_id, group: { id: input.group_id } },
    });
  }

  // ==================== Create ====================

  async create(input: {
    group_id: string;
    requester_id: string;
    body: CreateGroupCollectionDto;
  }) {
    const { group_id, requester_id, body } = input;

    const role =  await this.groupMemberService.checkActorRoleBeforeAction({
      actor_id: requester_id,
      group_id,
      actor_allow_roles: [Group_Member_Role.FOUNDER, Group_Member_Role.ADMIN],
    });

    const collection = await this.collectionRepo.save({
      title: body.title,
      group: { id: group_id },
      created_by: requester_id,
    });

    return this.filterByRoles.filterDataOfQueryResult({
      object: collection,
      label: role.toLowerCase(),
    });
  }

  // ==================== Read - Many ====================

  async findMany(input: {
    group_id: string;
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { group_id, requester_id, page, limit } = input;

    let label = ''
    try {
      const requesterRole = await this.groupMemberService.getRole({
        group_id,
        user_id: requester_id,
      });
      label = requesterRole.toLowerCase() // MEMBER -> member
    } catch (error) {
      // error mean not found in group
      const groupSetting = await this.groupService.getSetting(group_id);
      if ( groupSetting.view_mode ) label = 'unjoin';
      else return new UnauthorizedException({errorCode : 'unauthorized_to_access'});
    }

    const selects = this.filterByRoles.buildQuerySelectObject({ label });

    return this.collectionRepo.find({
      where: { group: { id: group_id } },
      select: selects,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  // ==================== Update ====================

  async update(input: {
    group_id: string;
    collection_id: string;
    requester_id: string;
    body: UpdateGroupCollectionDto;
  }) {
    const { group_id, collection_id, requester_id, body } = input;

    await this.groupMemberService.checkActorRoleBeforeAction({
      actor_id: requester_id,
      group_id,
      actor_allow_roles: [Group_Member_Role.FOUNDER, Group_Member_Role.ADMIN],
    });

    const result = await this.collectionRepo.update(
      { id: collection_id },
      body,
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'collection_not_found' });
    return true;
  }

  // ==================== Delete ====================

  async softDelete(input: {
    collection_id: string;
    requester_id: string;
    group_id : string;
  }) {
    const { collection_id, requester_id, group_id } = input;

    await this.groupMemberService.checkActorRoleBeforeAction({
      actor_id: requester_id,
      group_id,
      actor_allow_roles: [Group_Member_Role.FOUNDER, Group_Member_Role.ADMIN],
    });

    const result = await this.collectionRepo.update(
      { id: collection_id },
      { deleted_at: new Date(), deleted_by: requester_id },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'collection_not_found' });
    return true;
  }

  // ==================== Helpers ====================

  private async getOwnerGroupId(collection_id: string): Promise<string> {
    const base = await this.collectionRepo.findOne({
      where: { id: collection_id },
      relations: { group: true },
      select: { id: true, group: { id: true } },
    });
    if (!base)
      throw new NotFoundException({ errorCode: 'collection_not_found' });
    return base.group.id;
  }

  // ==========================================================================
  //                                 ADMIN
  // ==========================================================================

  async adminFindOne(input: { collection_id: string }) {
    const selects = this.filterByRoles.buildQuerySelectObject({
      label: 'admin',
    });
    const collection = await this.collectionRepo.findOne({
      where: { id: input.collection_id },
      select: selects,
    });
    if (!collection)
      throw new NotFoundException({ errorCode: 'collection_not_found' });
    return collection;
  }


  async adminFindMany(input: {
    group_id: string;
    page: number;
    limit: number;
  }) {
    const { group_id, page, limit } = input;
    const selects = this.filterByRoles.buildQuerySelectObject({
      label: 'admin',
    });

    return this.collectionRepo.find({
      where: { group: { id: group_id } },
      select: selects,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }


  async adminUpdate(input: {
    collection_id: string;
    body: UpdateGroupCollectionDto;
  }) {
    const result = await this.collectionRepo.update(
      { id: input.collection_id },
      input.body,
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'collection_not_found' });
    return true;
  }


  async adminSoftDelete(input: { collection_id: string; admin_id: string }) {
    const result = await this.collectionRepo.update(
        { id: input.collection_id },
        { deleted_at: new Date(), deleted_by: input.admin_id },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'collection_not_found' });
    return true;
  }


}


// async findOne(input: { collection_id: string; requester_id: string }) {
//   const { collection_id, requester_id } = input;
//
//   const base = await this.collectionRepo.findOne({
//     where: { id: collection_id },
//     relations: { group: true },
//     select: { id: true, group: { id: true, view_mode: true } },
//   });
//
//   if (!base)
//     throw new NotFoundException({ errorCode: 'collection_not_found' });
//
//   const label = await this.resolveReadLabel({
//     group_id: base.group.id,
//     view_mode: base.group.view_mode,
//     requester_id,
//   });
//
//   const selects = this.filterByRoles.buildQuerySelectObject({ label });
//
//   return this.collectionRepo.findOne({
//     where: { id: collection_id },
//     select: selects,
//   });
// }