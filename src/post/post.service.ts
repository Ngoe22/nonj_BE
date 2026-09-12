import {ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {FilterDbField} from "../_common/helper/filterQueryForRole.js";
import {Post} from "./entities/post.entity.js";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository} from "typeorm";
import {GroupCollectionService} from "../group/service/group_collection/group_collection.service.js";
import {GroupMemberService} from "../group/service/group_member/group_member.service.js";
import {Group_Member_Role, Group_View_Mode} from "../group/enum/group.enum.js";
import {UpdatePostDto} from "./dto/post.dto.js";

class CreatePostDto {
}

@Injectable()
export class PostService {
  private filterByRoles: FilterDbField<Post>;

  constructor(
      @InjectRepository(Post)
      private readonly postRepo: Repository<Post>,
  //
      private readonly groupMemberService: GroupMemberService,
      private readonly collectionService: GroupCollectionService,
  ) {
    this.filterByRoles = new FilterDbField({
      keyAndLabels: {
        id: ['member', 'unjoin', 'admin' , 'founder'],
        user: ['member', 'unjoin', 'admin' , 'founder'],
        title: ['member', 'unjoin', 'admin' , 'founder'],
        description: ['member', 'unjoin', 'admin' , 'founder'],
        exercise_content: ['member', 'unjoin', 'admin' , 'founder'],
        deadline_at: ['member', 'unjoin', 'admin' , 'founder'],
        is_retake: ['member', 'unjoin', 'admin' , 'founder'],
        view_each_unjoin_score: ['member', 'unjoin', 'admin' , 'founder'],
        group: ['member', 'unjoin', 'admin' , 'founder'],
        group_collection: ['member', 'unjoin', 'admin' , 'founder'],
        source_template_id: ['member',  'founder'],
      },
      dataBase: Post,
    });
  }

  // ==================== Private ====================


  // ==================== Create ====================

  async create(input: {
    group_id: string;
    collection_id: string;
    requester_id: string;
    body: CreatePostDto;
  }) {
    const { group_id, collection_id, requester_id, body } = input;

    const belongs = await this.collectionService.isCollectionBelongToGroup({ collection_id, group_id });
    if (!belongs) {
      throw new NotFoundException({ errorCode: 'collection_not_found_in_group' });
    }

    const role =  await this.groupMemberService.checkActorRoleBeforeAction({
      actor_id: requester_id,
      group_id,
      actor_allow_roles: [Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER],
    });

    const saveData =
        FilterDbField.turnObjInfoToRelationObj(body ,[ 'group_collection' , 'source_template_id' , 'user' ])

    const post = await this.postRepo.save(saveData);

    return this.filterByRoles.filterDataOfQueryResult({ object: post, label: role });
  }

  // ==================== Read - One ====================

  async findOne(input: {
    group_id: string;
    collection_id: string;
    post_id: string;
    requester_id: string;
  }) {
    const { group_id, collection_id, post_id, requester_id } = input;

    const requester_group_role =  await this.groupMemberService.checkActorRoleBeforeAction({
      actor_id: requester_id,
      group_id,
      actor_allow_roles: [Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER],
    });
    const selects = this.filterByRoles.buildQuerySelectObject({ label : requester_group_role });

    const post = await this.postRepo.findOne({
      where: {
        id: post_id,
        group: { id: group_id },
        group_collection: { id: collection_id },
      },
      select: selects,
    });

    if (!post) throw new NotFoundException({ errorCode: 'post_not_found' });
    return post;
  }

  // ==================== Read   ====================

  async findMany(input: {
    group_id: string;
    collection_id: string;
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { group_id, collection_id, requester_id, page, limit } = input;

    const requester_group_role =  await this.groupMemberService.checkActorRoleBeforeAction({
      actor_id: requester_id,
      group_id,
      actor_allow_roles: [Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER],
    });
    const selects = this.filterByRoles.buildQuerySelectObject({ label : requester_group_role });

    return this.postRepo.find({
      where: {
        group: { id: group_id },
        group_collection: { id: collection_id },
      },
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
    post_id: string;
    requester_id: string;
    body: UpdatePostDto;
  }) {
    const { group_id, collection_id, post_id, requester_id, body } = input;

    await this.groupMemberService.checkActorRoleBeforeAction({
      actor_id: requester_id,
      group_id,
      actor_allow_roles: [Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER],
    });

    const result = await this.postRepo.update(
        { id: post_id, group: { id: group_id }, group_collection: { id: collection_id } },
        body,
    );

    if (result.affected === 0) throw new NotFoundException({ errorCode: 'post_not_found' });
    return true;
  }

  // ==================== Delete ====================

  async softDelete(input: {
    group_id: string;
    collection_id: string;
    post_id: string;
    requester_id: string;
  }) {
    const { group_id, collection_id, post_id, requester_id } = input;

    await this.groupMemberService.checkActorRoleBeforeAction({
      actor_id: requester_id,
      group_id,
      actor_allow_roles: [Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER],
    });

    const result = await this.postRepo.update(
        { id: post_id, group: { id: group_id }, group_collection: { id: collection_id } },
        { deleted_at: new Date(), deleted_by: requester_id },
    );

    if (result.affected === 0) throw new NotFoundException({ errorCode: 'post_not_found' });
    return true;
  }




  // ==========================================================================
  //                                 ADMIN
  // ==========================================================================


  // ====================  read ====================

  async adminFindOne(input: { post_id: string }) {
    const selects = this.filterByRoles.buildQuerySelectObject({ label: 'admin' });
    const post = await this.postRepo.findOne({ where: { id: input.post_id }, select: selects });
    if (!post) throw new NotFoundException({ errorCode: 'post_not_found' });
    return post;
  }

  async adminFindMany(input: { collection_id: string; page: number; limit: number }) {
    const { collection_id, page, limit } = input;
    const selects = this.filterByRoles.buildQuerySelectObject({ label: 'admin' });

    return this.postRepo.find({
      where: { group_collection: { id: collection_id } },
      select: selects,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }


  // ====================  update ====================

  async adminUpdate(input: { post_id: string; body: UpdatePostDto }) {
    const result = await this.postRepo.update({ id: input.post_id }, input.body);
    if (result.affected === 0) throw new NotFoundException({ errorCode: 'post_not_found' });
    return true;
  }


  // ====================  delete ====================

  async adminSoftDelete(input: { post_id: string; admin_id: string }) {
    const result = await this.postRepo.update(
        { id: input.post_id },
        { deleted_at: new Date(), deleted_by: input.admin_id },
    );
    if (result.affected === 0) throw new NotFoundException({ errorCode: 'post_not_found' });
    return true;
  }

}