import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {FilterDbField} from "../_common/helper/filterQueryForRole.js";
import {Post} from "./entities/post.entity.js";
import {InjectDataSource, InjectRepository} from "@nestjs/typeorm";
import {DataSource, Repository} from "typeorm";
import {PostCollectionService} from "../group/service/post_collection/post_collection.service.js";
import {GroupMemberService} from "../group/service/group_member/group_member.service.js";
import {Group_Member_Role, Group_View_Mode} from "../group/enum/group.enum.js";
import {CreateExamPostDto, CreateExercisePostDto, UpdatePostDto} from "./dto/post.dto.js";
import {Post_Type, View_Each_Other_Answer} from "./enum/post.enum.js";
import { PostCollection } from '../group/entities/post_collection.entity.js';
import {Group} from "../group/entities/group.entity.js";
import {User} from "../user/entities/user.entity.js";

class CreatePostDto {
}

@Injectable()
export class PostService {
  private filterByLabels: FilterDbField<Post | User | Group | PostCollection, string>;

  constructor(
      @InjectDataSource()
      private readonly dataSource: DataSource,

      @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    //
    private readonly groupMemberService: GroupMemberService,
    private readonly collectionService: PostCollectionService,
  ) {
    this.filterByLabels =  FilterDbField.create({
      labels :  [ 'SA' , 'me', 'member', 'admin', 'founder']  ,
      fieldAndLabels: {
        id: ['founder', 'member', 'admin'],
        post_type: ['SA' ,'founder', 'member', 'admin'],
        title: ['SA' ,'founder', 'member', 'admin'],
        description: ['SA' ,'founder', 'member', 'admin'],
        question_type: ['SA' ,'founder', 'member', 'admin'],
        question_content: ['SA' ,'founder', 'member', 'admin'],
        deadline_at: ['SA' , 'founder', 'member', 'admin'],
        retake: ['SA' , 'member', 'admin'],
        view_each_other_answer: ['SA' ,'founder', 'member', 'admin'],
        user: {
          id : ['founder', 'member', 'admin'] ,
          nickname : ['founder', 'member', 'admin'],
          user_name : ['founder', 'member', 'admin'] ,
          avatar_url : ['founder', 'member', 'admin'],
        },
        group: {
          id : ['SA'] ,
          slug : ['SA' ],
          name : ['SA' ],
        },
        post_collection: {
          id : ['SA'] ,
          name : ['SA' ],
        },
      },
      dataBases: {
        _main : Post ,
        user : User ,
        group : Group ,
        post_collection : PostCollection ,
      },
      dataSource : this.dataSource

    });
  }

  // ==================== Private ====================

  private buildRelationFields(
    body: any,
    requester_id: string,
    group_id: string,
    collection_id: string,
  ) {
    return {
      user: { id: requester_id },
      group: { id: group_id },
      group_collection: { id: collection_id },
    };
  }

  // ==================== Check ====================

  private async checkBeforeCreate(input: {
    group_id: string;
    collection_id: string;
    requester_id: string;
  }) {
    const { group_id, collection_id, requester_id } = input;
    //
    // const poster_role =   await this.groupMemberService.checkActorRoleBeforeAction({
    //   actor_id: requester_id,
    //   group_id,
    //   actor_allow_roles: [Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER],
    // });
    //
    // const belongs = await this.collectionService.isCollectionBelongToGroup({ collection_id, group_id });
    // if (!belongs) throw new NotFoundException({ errorCode: 'collection_not_found_in_group' });
    //
    const result = await this.dataSource
      .createQueryBuilder()
      .select('gm.role', 'role')
      .from(PostCollection, 'c')
      .leftJoin(
        'group_member',
        'gm',
        'gm.group_id = c.group_id AND gm.user_id = :requester_id AND gm.deleted_at IS NULL',
        { requester_id },
      )
      .where('c.id = :collection_id', { collection_id })
      .andWhere('c.group_id = :group_id', { group_id })
      .getRawOne();

    if (!result) {
      throw new NotFoundException({
        errorCode: 'collection_not_found_in_group',
      });
    }

    const poster_role = result.role ?? null;
    if (
      !poster_role ||
      ![Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER].includes(
        poster_role,
      )
    ) {
      throw new ForbiddenException({
        errorCode: 'actor_not_allowed_to_do_action',
      });
    }
    //

    return poster_role;
  }

  // ==================== Create ====================

  async createExercise(input: {
    group_id: string;
    collection_id: string;
    requester_id: string;
    body: CreateExercisePostDto;
  }) {
    const { group_id, collection_id, requester_id, body } = input;

    const poster_role = await this.checkBeforeCreate({
      group_id,
      collection_id,
      requester_id,
    });

    // EXERCISE = no deadline + never view Other answer + always allow to retake

    const post = await this.postRepo.save({
      ...this.buildRelationFields(body, requester_id, group_id, collection_id),
      post_type: Post_Type.EXERCISE,
      ...body,
      deadline_at: null,
      retake: true,
      view_each_other_answer: View_Each_Other_Answer.NEVER,
    });

    return this.filterByLabels.filterDataOfQueryResult({
      object: post,
      label: poster_role.toLowerCase(),
    });
  }

  async createExam(input: {
    group_id: string;
    collection_id: string;
    requester_id: string;
    body: CreateExamPostDto;
  }) {
    const { group_id, collection_id, requester_id, body } = input;

    const poster_role = await this.checkBeforeCreate({
      group_id,
      collection_id,
      requester_id,
    });

    // EXERCISE =  deadline + view Other answer depend on setting + not allow to retake

    const post = await this.postRepo.save({
      ...this.buildRelationFields(body, requester_id, group_id, collection_id),
      post_type: Post_Type.EXAM,
      ...body,
      deadline_at: new Date(body.deadline_at),
      retake: false,
      view_each_other_answer: body.view_each_other_answer,
    });

    return this.filterByLabels.filterDataOfQueryResult({
      object: post,
      label: poster_role.toLowerCase(),
    });
  }

  // ==================== Read - One ====================

  async findOne(input: {
    group_id: string;
    collection_id: string;
    post_id: string;
    requester_id: string;
  }) {
    const { group_id, collection_id, post_id, requester_id } = input;

    const requester_group_role =
      await this.groupMemberService.checkActorRoleBeforeAction({
        actor_id: requester_id,
        group_id,
        actor_allow_roles: [Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER],
      });
    const { select ,relations } = this.filterByLabels.buildQueryObject({
      label: requester_group_role,
    });

    const post = await this.postRepo.findOne({
      where: {
        id: post_id,
        group: { id: group_id },
        post_collection: { id: collection_id },
      },
      relations ,
      select
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

    const requester_group_role =
      await this.groupMemberService.checkActorRoleBeforeAction({
        actor_id: requester_id,
        group_id,
        actor_allow_roles: [Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER],
      });
    const {select ,relations} = this.filterByLabels.buildQueryObject({
      label: requester_group_role,
    });

    return this.postRepo.find({
      where: {
        group: { id: group_id },
        post_collection: { id: collection_id },
      },
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
      {
        id: post_id,
        group: { id: group_id },
        post_collection: { id: collection_id },
      },
      body,
    );

    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'post_not_found' });
    return body;
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
      {
        id: post_id,
        group: { id: group_id },
        post_collection: { id: collection_id },
      },
      { deleted_at: new Date(), deleted_by: requester_id },
    );

    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'post_not_found' });
    return true;
  }

  // ==========================================================================
  //                                 ADMIN
  // ==========================================================================

  // ====================  read ====================

  async adminFindOne(input: { post_id: string }) {
    const { select ,relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });
    const post = await this.postRepo.findOne({
      where: { id: input.post_id },
      relations ,
      select
    });
    if (!post) throw new NotFoundException({ errorCode: 'post_not_found' });
    return post;
  }

  async adminFindMany(input: {
    collection_id: string;
    page: number;
    limit: number;
  }) {
    const { collection_id, page, limit } = input;
    const { select ,relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    return this.postRepo.find({
      where: { post_collection: { id: collection_id } },
      relations ,
      select ,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  // ====================  update ====================

  async adminUpdate(input: { post_id: string; body: UpdatePostDto }) {
    const result = await this.postRepo.update(
      { id: input.post_id },
      input.body,
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'post_not_found' });
    return true;
  }

  // ====================  delete ====================

  async adminSoftDelete(input: { post_id: string; admin_id: string }) {
    const result = await this.postRepo.update(
      { id: input.post_id },
      { deleted_at: new Date(), deleted_by: input.admin_id },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'post_not_found' });
    return true;
  }
}