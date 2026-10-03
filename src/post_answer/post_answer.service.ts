import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { FilterDbField } from '../_common/helper/filterQueryForRole.js';
import { PostAnswer } from './entities/post_answer.entity.js';
import { GroupMemberService } from '../group/service/group_member/group_member.service.js';
import {
  CreatePostAnswerDto,
  GradePostAnswerDto,
  GradeSectionDto,
} from './dto/post_answer.dto.js';
import { UserNotifService } from '../user_notif/user_notif.service.js';
import { User_Notif_Type } from '../user_notif/enum/user_notif.enum.js';
import { Retake, View_Each_Other_Answer } from '../post/enum/post.enum.js';
import {
  getQuestionSections,
  isFullyAutoGraded,
} from '../_common/helper/question_content.helper.js';
import { Question_Section_Type } from '../_common/helper/question_content.helper.js';
import { gradeAnswer } from '../_common/helper/grading.helper.js';
import { Post_Answer_Status } from './enum/post_answer.enum.js';
import { Group_Member_Role } from '../group/enum/group.enum.js';
import { Post } from '../post/entities/post.entity.js';
import { User } from '../user/entities/user.entity.js';
import { Group } from '../group/entities/group.entity.js';

@Injectable()
export class PostAnswerService {
  private filterByLabels: FilterDbField<PostAnswer | User, string>;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(PostAnswer)
    private readonly answerRepo: Repository<PostAnswer>,

    private readonly groupMemberService: GroupMemberService,
    private readonly notifService: UserNotifService,
  ) {
    this.filterByLabels = FilterDbField.create({
      labels: ['SA', 'me', 'member', 'admin', 'founder'],
      fieldAndLabels: {
        id: ['SA', 'me', 'member', 'admin', 'founder'],
        user: {
          id: ['SA', 'me', 'member', 'admin', 'founder'],
          user_name: ['SA', 'me', 'member', 'admin', 'founder'],
          nickname: ['SA', 'me', 'member', 'admin', 'founder'],
          avatar_url: ['me', 'member', 'admin', 'founder'],
        },
        post: {
          id: ['SA'],
        },
        group: {
          id: ['SA'],
          slug: ['SA'],
          name: ['SA'],
        },

        created_at: ['SA', 'me', 'member', 'admin', 'founder'],
        answer_content: ['SA', 'me', 'member', 'admin', 'founder'],
        point: ['SA', 'me', 'member', 'admin', 'founder'],
        max_point: ['SA', 'me', 'member', 'admin', 'founder'],
        status: ['SA', 'me', 'member', 'admin', 'founder'],
        graded_at: ['SA', 'me', 'member', 'admin', 'founder'],
        graded_by: ['SA', 'me', 'admin', 'founder'],

        review_content: ['SA', 'me', 'admin', 'founder'],
      },
      dataBases: {
        _main: PostAnswer,
        user: User,
        post: Post,
        group: Group,
        graded_by: User,
      },
      dataSource: this.dataSource,
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
      .leftJoin('p.post_answer', 'a', 'a.user_id = :requester_id', {
        requester_id,
      })
      .select([
        'p.id AS id',
        'p.content AS content',
        'p.correct_answer AS correct_answer',
        'p.retake AS retake',
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
      (check.already_answered === 'true' ||
        check.already_answered === true) &&
      check.retake === Retake.NEVER
    ) {
      throw new ConflictException({ errorCode: 'already_answered' });
    }

    // BE chấm điểm — FE không gửi `point`
    const grade = gradeAnswer(
      check.content,
      check.correct_answer,
      body.answer_content,
    );
    const isAutoGraded = grade.fully_auto_graded;

    const answer = await this.answerRepo.save({
      user: { id: requester_id },
      post: { id: post_id },
      group: { id: group_id },
      answer_content: body.answer_content,
      point: grade.point,
      max_point: grade.max_point,
      review_content: { auto: grade },
      status: isAutoGraded
        ? Post_Answer_Status.COMPLETED
        : Post_Answer_Status.PENDING,
      graded_at: isAutoGraded ? new Date() : null,
      graded_by: null,
    });

    return this.filterByLabels.filterDataOfQueryResult({
      object: answer as unknown as Record<string, any>,
      label: 'me',
    });
  }

  /**
   * Làm lại — chấm lại từ đầu vì nội dung bài làm đã thay đổi.
   */
  async exerciseMulChoiceRetake(input: {
    answer_id: string;
    user_id: string;
    body: CreatePostAnswerDto;
  }) {
    const { answer_id, user_id, body } = input;

    const answer = await this.answerRepo.findOne({
      where: { id: answer_id, user: { id: user_id } },
      relations: { post: true },
      select: {
        id: true,
        post: {
          id: true,
          content: true,
          correct_answer: true,
          retake: true,
          deadline_at: true,
        },
      },
    });
    if (!answer) throw new NotFoundException({ errorCode: 'answer_not_found' });

    if (answer.post.retake === Retake.NEVER)
      throw new ConflictException({ errorCode: 'retake_not_allowed' });

    if (answer.post.deadline_at && new Date() > answer.post.deadline_at)
      throw new ConflictException({ errorCode: 'post_deadline_passed' });

    const grade = gradeAnswer(
      answer.post.content,
      answer.post.correct_answer,
      body.answer_content,
    );
    const isAutoGraded = grade.fully_auto_graded;

    const result = await this.answerRepo.update(
      { id: answer_id, user: { id: user_id } },
      {
        answer_content: body.answer_content,
        point: grade.point,
        max_point: grade.max_point,
        review_content: { auto: grade } as Record<string, any>,
        status: isAutoGraded
          ? Post_Answer_Status.COMPLETED
          : Post_Answer_Status.PENDING,
        graded_at: isAutoGraded ? new Date() : null,
        graded_by: null,
      },
    );

    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'answer_not_found' });

    return this.answerRepo.findOne({ where: { id: answer_id } });
  }

  // ==================== Read - One (bài của người khác) ====================

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
    const label = String(actor_role).toLowerCase();

    if (label === 'member') {
      const result = await this.answerRepo
        .createQueryBuilder('a')
        .innerJoin('a.post', 'p')
        .select([
          'a.id AS id',
          'a.answer_content AS answer_content',
          'a.point AS point',
          'a.max_point AS max_point',
          'a.status AS status',
          'a.graded_at AS graded_at',
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

      const canView = this.isOthersAnswerVisible(
        result.view_each_other_answer,
        result.deadline_at,
      );

      if (!canView) {
        throw new ForbiddenException({
          errorCode: 'not_allowed_to_view_answer',
        });
      }

      // KHÔNG trả `review_content`: nó chứa đáp án đúng (auto.expected)
      return {
        id: result.id,
        answer_content: result.answer_content,
        point: result.point === null ? null : Number(result.point),
        max_point: result.max_point === null ? null : Number(result.max_point),
        status: result.status,
        graded_at: result.graded_at,
      };
    }

    // admin / founder xem đầy đủ
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label,
    });
    const answer = await this.answerRepo.findOne({
      where: { id: answer_id, post: { id: post_id } },
      relations,
      select,
    });
    if (!answer) throw new NotFoundException({ errorCode: 'answer_not_found' });
    return answer;
  }

  // ==================== Read - One (bài của mình) ====================

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
    if (isMem !== 'is')
      throw new ForbiddenException({ errorCode: 'actor_not_allow' });

    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'me',
    });

    const answer = await this.answerRepo.findOne({
      where: {
        group: { id: group_id },
        post: { id: post_id },
        user: { id: requester_id },
      },
      relations,
      select,
    });

    // Chưa làm bài KHÔNG phải lỗi — FE cần biết để hiện nút "Làm bài".
    // (Trước đây ném 404 nên FE không phân biệt được với lỗi thật.)
    return answer ?? null;
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
    const { relations, select } = this.filterByLabels.buildQueryObject({
      label,
    });

    return this.answerRepo.find({
      where: { post: { id: post_id } },
      relations,
      select,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'ASC' },
    });
  }

  // ==================== Grade — CHẤM TAY (admin/founder) ====================

  /**
   * Giáo viên chấm phần tự luận.
   *
   * Tổng điểm = điểm trắc nghiệm (BE đã chấm auto) + điểm tự luận (giáo viên
   * nhập), TRỪ KHI gửi `point` để ghi đè thẳng tổng.
   *
   * `sample_answer` gửi lên sẽ được ghi vào `post.correct_answer[index]` vì
   * đáp án mẫu là thuộc tính của ĐỀ, không phải của riêng một bài làm — nhờ vậy
   * mọi học viên đều thấy đáp án mới khi xem lại bài.
   */
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

    const hasManualInput = !!body.sections?.length || body.point !== undefined;

    // Đề toàn trắc nghiệm thì đã chấm tự động — chỉ chặn khi không có gì để chấm tay
    if (isFullyAutoGraded(post.content) && !hasManualInput) {
      throw new ConflictException({
        errorCode: 'multiple_choice_auto_graded_cannot_manual_grade',
      });
    }

    const answer = await this.answerRepo.findOne({
      where: { id: answer_id, post: { id: post_id } },
      relations: { user: true },
      select: {
        id: true,
        review_content: true,
        max_point: true,
        user: { id: true },
      },
    });
    if (!answer)
      throw new NotFoundException({ errorCode: 'answer_not_found' });

    const review = (answer.review_content ?? {}) as {
      auto?: Record<string, any>;
      manual?: Record<string, any>;
    };
    const auto = review.auto;

    // ---------- kẹp điểm tự luận vào [0, trần của CHÍNH phần đó] ----------
    // FE đã chặn rồi, nhưng BE là tầng có thẩm quyền: gọi API trực tiếp vẫn phải
    // đúng, không thể cho quá điểm tối đa của phần.
    const essayMaxByIndex = new Map<number, number>();
    getQuestionSections(post.content).forEach((raw, index) => {
      if (raw.type === Question_Section_Type.ESSAY) {
        essayMaxByIndex.set(index, Number((raw as { point?: number }).point ?? 0));
      }
    });

    const sections = (body.sections ?? []).map((section) => {
      const max = essayMaxByIndex.get(section.index) ?? 0;
      const raw = Number(section.point);
      const point = Number.isFinite(raw)
        ? Math.min(Math.max(raw, 0), max)
        : 0;

      return { ...section, point };
    });

    // ---------- ghi đè đáp án mẫu lên ĐỀ ----------
    const sampleAnswerByIndex = await this.applySampleAnswers({
      post,
      sections,
    });

    // ---------- tính điểm ----------
    const manualSections = sections.map((section) => ({
      index: section.index,
      point: section.point,
      comment: section.comment ?? '',
      sample_answer: section.sample_answer ?? null,
    }));

    const autoPoint = Number(auto?.point ?? 0);
    const manualPoint = manualSections.reduce(
      (sum, section) => sum + section.point,
      0,
    );

    const totalPoint =
      body.point !== undefined
        ? body.point
        : Number((autoPoint + manualPoint).toFixed(2));

    // ---------- cập nhật lại chi tiết auto cho section được chấm ----------
    const autoSections = Array.isArray(auto?.sections)
      ? (auto.sections as Record<string, any>[]).map((section) => {
          const manual = manualSections.find(
            (item) => item.index === section.index,
          );

          const overriddenSample = sampleAnswerByIndex[section.index];

          if (!manual && overriddenSample === undefined) return section;

          return {
            ...section,
            ...(manual
              ? {
                  point: manual.point,
                  earned_point: manual.point,
                  graded_manually: true,
                  teacher_comment: manual.comment,
                }
              : {}),
            ...(overriddenSample !== undefined
              ? { sample_answer: overriddenSample }
              : {}),
          };
        })
      : [];

    const result = await this.answerRepo.update(
      { id: answer_id },
      {
        status: body.status ?? Post_Answer_Status.COMPLETED,
        point: totalPoint,
        max_point: answer.max_point ?? auto?.max_point ?? 0,
        review_content: {
          ...(auto
            ? { auto: { ...auto, sections: autoSections } }
            : {}),
          manual: {
            graded_by: grader_id,
            graded_at: new Date().toISOString(),
            note: body.review_note ?? '',
            sections: manualSections,
            total_override: body.point ?? null,
            auto_point: autoPoint,
          },
        } as Record<string, any>,
        graded_by: { id: grader_id },
        graded_at: new Date(),
      },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'answer_not_found' });

    // ---------- báo cho học viên ----------
    const studentId = answer.user?.id;
    if (studentId) {
      await this.notifService
        .send({
          user_id: studentId,
          type: User_Notif_Type.GRADED_POST,
          content: {
            group_id,
            collection_id,
            post_id,
            title: post.title,
            point: totalPoint,
            max_point: answer.max_point ?? auto?.max_point ?? 0,
          },
        })
        .catch(() => undefined);
    }

    return true;
  }

  /**
   * Ghi `sample_answer` của giáo viên vào `post.correct_answer`.
   * Trả về map index -> đáp án mới để đồng bộ luôn vào review_content.auto.
   */
  private async applySampleAnswers(input: {
    post: Post;
    sections: GradeSectionDto[];
  }): Promise<Record<number, string>> {
    const applied: Record<number, string> = {};

    const withSample = input.sections.filter(
      (section) => section.sample_answer !== undefined,
    );
    if (withSample.length === 0) return applied;

    const correctAnswer = Array.isArray(input.post.correct_answer)
      ? ([...input.post.correct_answer] as Record<string, any>[])
      : [];

    let changed = false;

    for (const section of withSample) {
      const current = correctAnswer[section.index];
      // chỉ ghi đè được section tự luận — trắc nghiệm do BE chấm auto
      if (!current || current.type !== 'essay') continue;

      correctAnswer[section.index] = {
        ...current,
        sample_answer: section.sample_answer ?? '',
      };
      applied[section.index] = section.sample_answer ?? '';
      changed = true;
    }

    if (changed) {
      await this.dataSource
        .getRepository(Post)
        .update({ id: input.post.id }, { correct_answer: correctAnswer });
    }

    return applied;
  }

  // ==================== Delete ====================

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
        actor_allow_roles: [
          Group_Member_Role.ADMIN,
          Group_Member_Role.FOUNDER,
        ],
      });
    }

    const result = await this.answerRepo.update(
      { id: answer_id },
      { deleted_by: requester_id, deleted_at: new Date() },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'answer_not_found' });
    return true;
  }

  // ==========================================================================
  //                                 ADMIN
  // ==========================================================================

  async adminFindOne(input: { answer_id: string }) {
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });
    const answer = await this.answerRepo.findOne({
      where: { id: input.answer_id },
      select,
      relations,
    });
    if (!answer) throw new NotFoundException({ errorCode: 'answer_not_found' });
    return answer;
  }

  async adminFindMany(input: { post_id: string; page: number; limit: number }) {
    const { post_id, page, limit } = input;
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    return this.answerRepo.find({
      where: { post: { id: post_id } },
      select,
      relations,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'ASC' },
    });
  }

  async adminSoftDeleteOne(input: { answer_id: string; admin_id: string }) {
    const { admin_id, answer_id } = input;

    const result = await this.answerRepo.update(
      { id: answer_id },
      { deleted_by: admin_id, deleted_at: new Date() },
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
        title: true,
        content: true,
        correct_answer: true,
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
      case View_Each_Other_Answer.NEVER:
        return false;

      case View_Each_Other_Answer.AFTER_DEADLINE:
        if (deadline_at) return new Date() > deadline_at;
        return false;

      case View_Each_Other_Answer.AFTER_ANSWER:
        return true;

      default:
        return false;
    }
  }
}
