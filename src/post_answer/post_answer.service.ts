import {ConflictException, ForbiddenException, Injectable, NotFoundException} from "@nestjs/common";
import {FilterDbField} from "../_common/helper/filterQueryForRole.js";
import {PostAnswer} from "./entities/post_answer.entity.js";
import {InjectDataSource, InjectRepository} from "@nestjs/typeorm";
import {DataSource, Repository} from "typeorm";
import {GroupMemberService} from "../group/service/group_member/group_member.service.js";
import { CreatePostAnswerDto, GradePostAnswerDto } from "./dto/post_answer.dto.js";
import {Exercise_Type, Post_Type, View_Each_Other_Answer } from "../post/enum/post.enum.js";
import { Post_Answer_Status } from "./enum/post_answer.enum.js";
import { Group_Member_Role } from "../group/enum/group.enum.js";
import {Post} from "../post/entities/post.entity.js";

@Injectable()
export class PostAnswerService {
  private filterByRoles: FilterDbField<PostAnswer>;

  constructor(
      @InjectRepository(PostAnswer)
      private readonly answerRepo: Repository<PostAnswer>,
      @InjectDataSource()
      private readonly dataSource: DataSource,
      private readonly groupMemberService: GroupMemberService,
  ) {
    this.filterByRoles = new FilterDbField({
      keyAndLabels: {
        id: ['me', 'other', 'admin'],
        user: ['me', 'other', 'admin'],
        post: ['me', 'other', 'admin'],
        group: ['admin'],
        answer_content: ['me', 'admin'],
        status: ['me', 'other', 'admin'],
        graded_by: ['me', 'admin'],
        graded_at: ['me', 'other', 'admin'],
        review_content: ['me', 'admin'],
      },
      dataBase: PostAnswer,
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

    const post = await this.isPostExist({ post_id, group_id, collection_id });

    if (post.post_type === Post_Type.EXAM) {
      if (post.deadline_at && new Date() > post.deadline_at) {
        throw new ConflictException({ errorCode: 'post_deadline_passed' });
      }

      const alreadyAnswered = await this.answerRepo.exists({
        where: { post: { id: post_id }, user: { id: requester_id } },
      });
      if (alreadyAnswered) {
        throw new ConflictException({ errorCode: 'already_answered' });
      }
    }
    // EXERCISE: retake luôn true — không cần check gì thêm, nộp bao nhiêu lần cũng được

    const isAutoGraded = post.question_type === Exercise_Type.MULTIPLE_CHOICE;

    const answer = await this.answerRepo.save({
      user: { id: requester_id },
      post: { id: post_id },
      group: { id: group_id },
      answer_content: body.answer_content,
      status: isAutoGraded ? Post_Answer_Status.COMPLETED : Post_Answer_Status.PENDING,
      graded_at: isAutoGraded ? new Date() : null,
      graded_by: null,   // multiple choice tự chấm, không có người chấm
    });

    return this.filterByRoles.filterDataOfQueryResult({ object: answer, label: 'me' });
  }


  async exerciseMulChoiceRetake ( input : {
    answer_id: string;
    user_id: string;
    body: CreatePostAnswerDto;
  } ) {
      const { answer_id , user_id , body  } = input;

    const result  = await this.answerRepo.update(
        {id : answer_id, user : { id : user_id },} ,
        { answer_content : body.answer_content  }
    )

    if ( result.affected === 0 )
      throw new NotFoundException({errorCode : 'answer_not_found'})

    return body.answer_content
  }


  // ==================== Read - One ====================

  async findOne(input: {
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

    const base = await this.answerRepo.findOne({
      where: {
        id: answer_id,
        post: { id: post_id,
        group: { id: group_id },
        group_collection: { id: collection_id } },
      },
      relations: { user: true, post: true },
      select: {
        id: true,
        user: { id: true },
        post: { id: true, view_each_other_answer: true, deadline_at: true },
      },
    });

    if (!base) throw new NotFoundException({ errorCode: 'answer_not_found' });

    const label = this.resolveAnswerLabel({
      actor_role,
      is_owner: base.user.id === requester_id,
      view_each_other_answer: base.post.view_each_other_answer,
      deadline_at: base.post.deadline_at,
    });

    const selects = this.filterByRoles.buildQuerySelectObject({ label });

    const answer = await this.answerRepo.findOne({ where: { id: answer_id }, select: selects });
    if (!answer) throw new NotFoundException({ errorCode: 'answer_not_found' });
    return answer;
  }

  // ==================== Read - Many (theo post) ====================

  async findMany(input: {
    group_id: string;
    collection_id: string;
    post_id: string;
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { group_id, collection_id, post_id, requester_id, page, limit } = input;

    const actor_role = await this.groupMemberService.getRole({
      group_id,
      user_id: requester_id,
      error_msg: 'not_a_member',
    });

    const post = await this.isPostExist({ post_id, group_id, collection_id });

    const isPrivileged = [Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER].includes(actor_role);
    const canSeeOthers = isPrivileged || this.isOthersAnswerVisible(post.view_each_other_answer, post.deadline_at);

    const condition = canSeeOthers
        ? { post: { id: post_id } }
        : { post: { id: post_id }, user: { id: requester_id } };

    const label = isPrivileged ? 'admin' : canSeeOthers ? 'other' : 'me';
    const selects = this.filterByRoles.buildQuerySelectObject({ label });

    return this.answerRepo.find({
      where: condition,
      select: selects,
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
    const { group_id, collection_id, post_id, answer_id, grader_id, body } = input;

    await this.groupMemberService.checkActorRoleBeforeAction({
      actor_id: grader_id,
      group_id,
      actor_allow_roles: [Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER],
    });

    const post = await this.isPostExist({ post_id, group_id, collection_id });

    if (post.question_type === Exercise_Type.MULTIPLE_CHOICE) {
      throw new ConflictException({ errorCode: 'multiple_choice_auto_graded_cannot_manual_grade' });
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

    if (result.affected === 0) throw new NotFoundException({ errorCode: 'answer_not_found' });
    return true;
  }

  // ==========================================================================
  //                                 ADMIN
  // ==========================================================================

  async adminGrade(input: { post_id: string; answer_id: string; admin_id: string; body: GradePostAnswerDto }) {
    const { post_id, answer_id, admin_id, body } = input;

    const post = await this.dataSource.getRepository(Post).findOne({
      where: { id: post_id },
      select: { id: true, question_type: true },
    });
    if (!post) throw new NotFoundException({ errorCode: 'post_not_found' });

    if (post.question_type === Exercise_Type.MULTIPLE_CHOICE) {
      throw new ConflictException({ errorCode: 'multiple_choice_auto_graded_cannot_manual_grade' });
    }

    const result = await this.answerRepo.update(
        { id: answer_id },
        {
          status: Post_Answer_Status.COMPLETED,
          review_content: body.review_content,
          graded_by: { id: admin_id },
          graded_at: new Date(),
        },
    );

    if (result.affected === 0) throw new NotFoundException({ errorCode: 'answer_not_found' });
    return true;
  }

  async adminFindOne(input: { answer_id: string }) {
    const selects = this.filterByRoles.buildQuerySelectObject({ label: 'admin' });
    const answer = await this.answerRepo.findOne({ where: { id: input.answer_id }, select: selects });
    if (!answer) throw new NotFoundException({ errorCode: 'answer_not_found' });
    return answer;
  }

  async adminFindMany(input: { post_id: string; page: number; limit: number }) {
    const { post_id, page, limit } = input;
    const selects = this.filterByRoles.buildQuerySelectObject({ label: 'admin' });

    return this.answerRepo.find({
      where: { post: { id: post_id } },
      select: selects,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'ASC' },
    });
  }

  // ==================== Helpers ====================

  private async isPostExist(input: {
    post_id: string;
    group_id: string;
    collection_id: string;
  }): Promise<{
    post_type: Post_Type;
    question_type: Exercise_Type;
    deadline_at: Date | null;
    view_each_other_answer: View_Each_Other_Answer;
  }> {
    const { post_id, group_id, collection_id } = input;

    const post = await this.dataSource.getRepository(Post).findOne({
      where: { id: post_id },
      relations: { group: true, group_collection: true },
      select: {
        id: true,
        post_type: true,
        question_type: true,
        deadline_at: true,
        view_each_other_answer: true,
        group: { id: true },
        group_collection: { id: true },
      },
    });

    if (!post || post.group.id !== group_id || post.group_collection.id !== collection_id) {
      throw new NotFoundException({ errorCode: 'post_not_exist' });
    }

    return post;
  }

  private isOthersAnswerVisible(mode: View_Each_Other_Answer, deadline_at: Date | null): boolean {
    if (mode === View_Each_Other_Answer.NEVER) return false;
    // AFTER_DEADLINE: chỉ EXAM mới có deadline; nếu chưa qua deadline thì chưa cho xem
    return !!deadline_at && new Date() > deadline_at;
  }

  private resolveAnswerLabel(input: {
    actor_role: Group_Member_Role;
    is_owner: boolean;
    view_each_other_answer: View_Each_Other_Answer;
    deadline_at: Date | null;
  }): 'me' | 'other' | 'admin' {
    const { actor_role, is_owner, view_each_other_answer, deadline_at } = input;

    if ([Group_Member_Role.ADMIN, Group_Member_Role.FOUNDER].includes(actor_role)) return 'admin';
    if (is_owner) return 'me';
    if (this.isOthersAnswerVisible(view_each_other_answer, deadline_at)) return 'other';

    throw new ForbiddenException({ errorCode: 'not_allowed_to_view_answer' });
  }
}