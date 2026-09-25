import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {FilterDbField} from "../_common/helper/filterQueryForRole.js";
import {PostAnswer} from "./entities/post_answer.entity.js";
import {InjectDataSource, InjectRepository} from "@nestjs/typeorm";
import {DataSource, Repository} from "typeorm";
import {GroupMemberService} from "../group/service/group_member/group_member.service.js";
import { CreatePostAnswerDto, GradePostAnswerDto } from "./dto/post_answer.dto.js";
import { Question_Type, Retake, View_Each_Other_Answer} from "../post/enum/post.enum.js";
import { Post_Answer_Status } from "./enum/post_answer.enum.js";
import { Group_Member_Role } from "../group/enum/group.enum.js";
import {Post} from "../post/entities/post.entity.js";
import {User} from "../user/entities/user.entity.js";
import {Group} from "../group/entities/group.entity.js";

@Injectable()
export class PostAnswerService {
  private filterByLabels: FilterDbField<PostAnswer | User, string>;

  constructor(
      @InjectDataSource()
      private readonly dataSource: DataSource,

      @InjectRepository(PostAnswer)
    private readonly answerRepo: Repository<PostAnswer>,
    //
    private readonly groupMemberService: GroupMemberService,
  ) {
    this.filterByLabels =  FilterDbField.create({
      labels : [ 'SA' , 'me', 'member', 'admin', 'founder'] ,
      fieldAndLabels: {
        id: ['SA' ,'me', 'member', 'admin', 'founder'],
        user: {
          id : ['SA' ,'me', 'member', 'admin', 'founder'] ,
          user_name : ['SA' ,'me', 'member', 'admin', 'founder'] ,
          nickname : ['SA' ,'me', 'member', 'admin', 'founder'] ,
          avatar_url : ['me', 'member', 'admin', 'founder'] ,
        } ,
        post: {
          id : ['SA']
        },
        group: {
          id : ['SA'] ,
          slug : [ 'SA' ] ,
          name: ['SA']
        },
        answer_content: [ 'SA' , 'me', 'admin', 'founder'],
        status: ['SA' ,'me', 'member', 'admin', 'founder'],
        graded_by: ['SA' ,'me', 'admin', 'founder'],
        graded_at: ['SA' ,'me', 'member', 'admin', 'founder'],
        review_content: ['SA' ,'me', 'admin', 'founder'],
      },
      dataBases: {
        _main : PostAnswer ,
        user : User ,
        post : Post ,
        group : Group,
        graded_by :User
      },
      dataSource : this.dataSource

    });
  }

  // ==================== Create ====================

  async create(input: {
    group_id: string;
    collection_id: string;
    post_id: string;
    requester_id: string;
    body: CreatePostAnswerDto;
  }) {
    const { group_id, collection_id, post_id, requester_id, body } = input;

    await this.groupMemberService.getRole({
      group_id,
      user_id: requester_id,
      error_msg: 'not_a_member',
    });

    const check = await this.dataSource
      .getRepository(Post)
      .createQueryBuilder('p')
      .leftJoin('p.answer', 'a', 'a.user_id = :requester_id', { requester_id })
      .select([
        'p.id AS id',
        'p.post_type AS post_type',
        'p.question_type AS question_type',
        'p.deadline_at AS deadline_at',
        'CASE WHEN a.id IS NOT NULL THEN true ELSE false END AS already_answered',
      ])
      .where('p.id = :post_id', { post_id })
      .andWhere('p.group_id = :group_id', { group_id })
      .andWhere('p.post_collection_id = :collection_id', { collection_id })
      .getRawOne();

    if (!check)
      throw new NotFoundException({ errorCode: 'post_not_found_in_scope' });


    if (check.deadline_at && new Date() > new Date(check.deadline_at)) {
      throw new ConflictException({ errorCode: 'post_deadline_passed' });
    }

    if (
        check.already_answered === 'true' ||
        check.already_answered === true
    ) {
      if  ( check.retake === Retake.NEVER )
        throw new ConflictException({ errorCode: 'already_answered' });
    }


    const isAutoGraded = check.question_type === Question_Type.MULTIPLE_CHOICE;

    const answer = await this.answerRepo.save({
      user: { id: requester_id },
      post: { id: post_id },
      group: { id: group_id },
      answer_content: body.answer_content,
      status: isAutoGraded
        ? Post_Answer_Status.COMPLETED
        : Post_Answer_Status.PENDING,
      graded_at: isAutoGraded ? new Date() : null,
      graded_by: null,
    });

    return this.filterByLabels.filterDataOfQueryResult({
      object: answer,
      label: 'me',
    });
  }

  async exerciseMulChoiceRetake(input: {
    answer_id: string;
    user_id: string;
    body: CreatePostAnswerDto;
  }) {
    const { answer_id, user_id, body } = input;

    const result = await this.answerRepo.update(
      { id: answer_id, user: { id: user_id } },
      { answer_content: body.answer_content },
    );

    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'answer_not_found' });

    return body.answer_content;
  }

  // ==================== Read - One ====================

  async findOthersOne(input: {
    group_id: string;
    collection_id: string;
    post_id: string;
    answer_id: string;
    requester_id: string;
  }) {
    const { group_id, collection_id, post_id, answer_id, requester_id } = input;

    const actor_role = await this.groupMemberService.getRole({
      group_id,
      user_id: requester_id,
      error_msg: 'not_a_member',
    });
    const label = actor_role.toLowerCase();

    if (label === 'member') {
      const result = await this.answerRepo
        .createQueryBuilder('a')
        .innerJoin('a.post', 'p')
        .select([
          'a.id AS id',
          'a.answer_content AS answer_content',
          'a.status AS status',
          'a.graded_at AS graded_at',
          'a.review_content AS review_content',
          'p.view_each_other_answer AS view_each_other_answer',
          'p.deadline_at AS deadline_at',
        ])
        .where('a.id = :answer_id', { answer_id })
        .andWhere('p.id = :post_id', { post_id })
        .andWhere('p.group_id = :group_id', { group_id })
        .andWhere('p.post_collection_id = :collection_id', { collection_id })
        .getRawOne();

      if (!result)
        throw new NotFoundException({ errorCode: 'answer_not_found' });

      const canView =
        result.view_each_other_answer ===
          View_Each_Other_Answer.AFTER_DEADLINE &&
        result.deadline_at &&
        new Date() > new Date(result.deadline_at);

      if (!canView) {
        throw new ForbiddenException({
          errorCode: 'not_allowed_to_view_answer',
        });
      }

      return {
        id: result.id,
        answer_content: result.answer_content,
        status: result.status,
        graded_at: result.graded_at,
        review_content: result.review_content,
      };
    }
  }

  async findMine(input: {
    group_id: string;
    post_id: string;
    requester_id: string;
  }) {
    const { group_id, post_id, requester_id } = input;


    const isMem = await this.groupMemberService.isMember({
      group_id,
      user_id: requester_id,
    });
    if ( !isMem ) return  new ForbiddenException({ errorCode :'actor_not_allow' })

    const { select ,relations } = this.filterByLabels.buildQueryObject({ label: 'me' });

    const answer = await this.answerRepo.findOne({
      where: {
        group : { id : group_id } ,
        post: { id: post_id },
        user: { id: requester_id },

      },
      relations , select
    });
    if (!answer) throw new NotFoundException({ errorCode: 'answer_not_found' });
    return answer;
  }

  // ==================== Read - Many ====================

  async findOthersMany(input: {
    group_id: string;
    collection_id: string;
    post_id: string;
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { group_id, collection_id, post_id, requester_id, page, limit } =
      input;

    const actor_role = await this.groupMemberService.getRole({
      group_id,
      user_id: requester_id,
      error_msg: 'not_a_member',
    });

    const post = await this.isPostExist({ post_id, group_id, collection_id });

    const isPrivileged = [
      Group_Member_Role.ADMIN,
      Group_Member_Role.FOUNDER,
    ].includes(actor_role);

    const canSeeOthers =
      isPrivileged ||
      this.isOthersAnswerVisible(post.view_each_other_answer, post.deadline_at);

    if (!canSeeOthers)
      throw new ForbiddenException({
        errorCode: 'not_allow_to_view_others_answer',
      });

    const label = isPrivileged ? 'admin' : 'member';
    const { relations , select } = this.filterByLabels.buildQueryObject({ label });

    return this.answerRepo.find({
      where: { post: { id: post_id } },
      relations , select ,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'ASC' },
    });
  }

  // ==================== Grade (chỉ dành cho ESSAY) ====================

  async grade(input: {
    group_id: string;
    collection_id: string;
    post_id: string;
    answer_id: string;
    grader_id: string;
    body: GradePostAnswerDto;
  }) {
    const { group_id, collection_id, post_id, answer_id, grader_id, body } =
      input;

    await this.groupMemberService.checkActorRoleBeforeAction({
      actor_id: grader_id,
      group_id,
      actor_allow_roles: [Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER],
    });

    const post = await this.isPostExist({ post_id, group_id, collection_id });

    if (post.question_type === Question_Type.MULTIPLE_CHOICE) {
      throw new ConflictException({
        errorCode: 'multiple_choice_auto_graded_cannot_manual_grade',
      });
    }

    const result = await this.answerRepo.update(
      { id: answer_id, post: { id: post_id } },
      {
        status: Post_Answer_Status.COMPLETED,
        review_content: body.review_content,
        graded_by: { id: grader_id },
        graded_at: new Date(),
      },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'answer_not_found' });
    return true;
  }

  // ----------------- delete -----------------

  async softDelete(input: {
    group_id: string;
    collection_id: string;
    post_id: string;
    answer_id: string;
    requester_id: string;
  }) {
    const { group_id, collection_id, post_id, answer_id, requester_id } = input;

    const answer = await this.answerRepo.findOne({
      where: {
        id: answer_id,
        post: {
          id: post_id,
          group: { id: group_id },
          post_collection: { id: collection_id },
        },
      },
      relations: { user: true },
      select: { id: true, user: { id: true } },
    });

    if (!answer) throw new NotFoundException({ errorCode: 'answer_not_found' });

    const isOwner = answer.user.id === requester_id;

    if (!isOwner) {
      await this.groupMemberService.checkActorRoleBeforeAction({
        actor_id: requester_id,
        group_id,
        actor_allow_roles: [Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER],
      });
    }

    const result = await this.answerRepo.update(
      { id: answer_id },
      {
        deleted_by: requester_id,
        deleted_at: new Date(),
      },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'answer_not_found' });
    return true;
  }

  // ==========================================================================
  //                                 ADMIN
  // ==========================================================================

  async adminFindOne(input: { answer_id: string }) {
    const { select , relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });
    const answer = await this.answerRepo.findOne({
      where: { id: input.answer_id },
      select , relations
    });
    if (!answer) throw new NotFoundException({ errorCode: 'answer_not_found' });
    return answer;
  }

  async adminFindMany(input: { post_id: string; page: number; limit: number }) {
    const { post_id, page, limit } = input;
    const { select , relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    return this.answerRepo.find({
      where: { post: { id: post_id } },
      select , relations ,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'ASC' },
    });
  }

  async adminSoftDeleteOne(input: { answer_id: string; admin_id: string }) {
    const { admin_id, answer_id } = input;

    const result = await this.answerRepo.update(
      { id: answer_id },
      {
        deleted_by: admin_id,
        deleted_at: new Date(),
      },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'answer_not_found' });
    return true;
  }

  // ==================== Helpers ====================

  private async isPostExist(input: {
    post_id: string;
    group_id: string;
    collection_id: string;
  }) {
    const { post_id, group_id, collection_id } = input;

    const post = await this.dataSource.getRepository(Post).findOne({
      where: { id: post_id },
      relations: { group: true, post_collection: true },
      select: {
        id: true,
        question_type: true,
        deadline_at: true,
        view_each_other_answer: true,
        group: { id: true },
        post_collection: { id: true },
      },
    });

    if (
      !post ||
      post.group.id !== group_id ||
      post.post_collection.id !== collection_id
    ) {
      throw new NotFoundException({ errorCode: 'post_not_exist' });
    }

    return post;
  }

  private isOthersAnswerVisible(
    mode: View_Each_Other_Answer,
    deadline_at: Date | null,
  ): boolean {
    switch (mode) {
      case View_Each_Other_Answer.NEVER: {
        return false;
      }
      case View_Each_Other_Answer.AFTER_DEADLINE: {
        if ( deadline_at )
          return new Date() > deadline_at;
      }
      default:
        return true;
    }
  }

  private resolveAnswerLabel(input: {
    actor_role: Group_Member_Role;
    is_owner: boolean;
    view_each_other_answer: View_Each_Other_Answer;
    deadline_at: Date | null;
  }): 'me' | 'member' | 'admin' {
    const { actor_role, is_owner, view_each_other_answer, deadline_at } = input;

    if (
      [Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER].includes(actor_role)
    )
      return 'admin';
    if (is_owner) return 'me';
    if (this.isOthersAnswerVisible(view_each_other_answer, deadline_at))
      return 'member';

    throw new ForbiddenException({ errorCode: 'not_allowed_to_view_answer' });
  }
}