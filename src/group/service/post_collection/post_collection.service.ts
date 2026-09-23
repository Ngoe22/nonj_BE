import {
  ForbiddenException,
  Injectable,
  NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import {
  CreatePostCollectionDto,
  UpdatePostCollectionDto,
} from '../../dto/group_post_collection.dto.js';
import { FilterDbField } from '../../../_common/helper/filterQueryForRole.js';
import { PostCollection} from '../../entities/post_collection.entity.js';
import {InjectDataSource, InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import { GroupMemberService } from '../group_member/group_member.service.js';
import { Group_Member_Role, Group_View_Mode } from '../../enum/group.enum.js';
import { GroupService } from '../group/group.service.js';
import {Group} from "../../entities/group.entity.js";

@Injectable()
export class PostCollectionService {
  private filterByLabels: FilterDbField<PostCollection | Group, string>;

  constructor(
      @InjectDataSource()
      private readonly dataSource: DataSource,
    @InjectRepository(PostCollection)
    private readonly collectionRepo: Repository<PostCollection>,
    //
    private readonly groupMemberService: GroupMemberService,
    private readonly groupService: GroupService,
  ) {

    //

    // SA == SYSTEM ADMIN
    this.filterByLabels = FilterDbField.create({
      labels: ['SA', 'admin', 'founder', 'member', 'unjoin'],
      fieldAndLabels: {
        id: ['SA', 'member', 'unjoin', 'admin', 'founder'],
        title: ['SA', 'member', 'unjoin', 'admin', 'founder'],
        desc: ['SA', 'member', 'unjoin', 'admin', 'founder'],
        created_at: ['SA', 'founder', 'admin', 'member', 'unjoin'],
        group: {
          id: ['SA'],
          name: ['SA'],
          slug: ['SA'],
        },
      },
      dataBases: {
        _main: PostCollection,
        group: Group,
      },
      dataSource: this.dataSource,
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
    body: CreatePostCollectionDto;
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

    return this.filterByLabels.filterDataOfQueryResult({
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
      else return new ForbiddenException({errorCode : 'not_allow_to_access'});
    }

    const { select ,relations } = this.filterByLabels.buildQueryObject({ label });

    return this.collectionRepo.find({
      where: { group: { id: group_id } },
      relations ,
      select,
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
    body: UpdatePostCollectionDto;
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
    const  { relations , select } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });
    const collection = await this.collectionRepo.findOne({
      where: { id: input.collection_id },
      relations ,
      select ,
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
    const  { relations , select } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    return this.collectionRepo.find({
      where: { group: { id: group_id } },
      relations ,
      select,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }


  async adminUpdate(input: {
    collection_id: string;
    body: UpdatePostCollectionDto;
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
//   const selects = this.filterByLabels.buildQuerySelectObject({ label });
//
//   return this.collectionRepo.findOne({
//     where: { id: collection_id },
//     select: selects,
//   });
// }