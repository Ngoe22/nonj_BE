import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { FilterDbField } from '../_common/helper/filterQueryForRole.js';
import { AdminPostQueryDto } from './dto/admin-post-query.dto.js';
import {
  adminCreatedRange,
  adminLike,
  adminPage,
  adminUuidLike,
  markDeleted,
  adminWhere,
} from '../_common/helper/admin_query.helper.js';
import { Post } from './entities/post.entity.js';
import { PostCollectionService } from '../group/service/post_collection/post_collection.service.js';
import { GroupMemberService } from '../group/service/group_member/group_member.service.js';
import { Group_Member_Role } from '../group/enum/group.enum.js';
import {
  CreatePostDto,
  CreatePostFromPreparationDto,
  UpdatePostDto,
} from './dto/post.dto.js';
import { PostCollection } from '../group/entities/post_collection.entity.js';
import { Group } from '../group/entities/group.entity.js';
import { User } from '../user/entities/user.entity.js';
import { QuestionPreparation } from '../question_preparation/entities/question_preparation.entity.js';
import { PostAnswer } from '../post_answer/entities/post_answer.entity.js';
import { Retake, View_Each_Other_Answer } from './enum/post.enum.js';
import { UserNotifService } from '../user_notif/user_notif.service.js';
import { User_Notif_Type } from '../user_notif/enum/user_notif.enum.js';


@Injectable()
export class PostService {
  private filterByLabels: FilterDbField<
    Post | User | Group | PostCollection,
    string
  >;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,

    @InjectRepository(QuestionPreparation)
    private readonly preparationRepo: Repository<QuestionPreparation>,

    @InjectRepository(PostAnswer)
    private readonly answerRepo: Repository<PostAnswer>,

    private readonly groupMemberService: GroupMemberService,
    private readonly collectionService: PostCollectionService,
    private readonly notifService: UserNotifService,
  ) {
    this.filterByLabels = FilterDbField.create({
      labels: ['SA', 'member', 'admin', 'founder'],
      fieldAndLabels: {
        id: ['SA', 'member', 'admin', 'founder'],
        title: ['SA', 'member', 'admin', 'founder'],
        description: ['SA', 'member', 'admin', 'founder'],
        content: ['SA', 'member', 'admin', 'founder'],
        // `correct_answer` CÓ trong select cho cả 'member' — vì member ĐÃ LÀM BÀI
        // thì được xem đáp án để tự so sánh, còn CHƯA làm thì `findOne` xoá đi.
        // (Trước đây để thiếu 'member' nên field không được select, và nhánh
        // "đã làm bài thì cho xem đáp án" không bao giờ chạy được.)
        correct_answer: ['SA', 'member', 'admin', 'founder'],
        deadline_at: ['SA', 'member', 'admin', 'founder'],
        retake: ['SA', 'member', 'admin', 'founder'],
        view_each_other_answer: ['SA', 'member', 'admin', 'founder'],
        created_at: ['SA', 'member', 'admin', 'founder'],
        // admin cần thấy trạng thái + mốc cập nhật/xoá mềm
        updated_at: ['SA'],
        deleted_at: ['SA'],
        user: {
          id: ['SA', 'member', 'admin', 'founder'],
          nickname: ['SA', 'member', 'admin', 'founder'],
          user_name: ['SA', 'member', 'admin', 'founder'],
          avatar_url: ['SA', 'member', 'admin', 'founder'],
        },
        group: {
          id: ['SA'],
          slug: ['SA'],
          name: ['SA'],
        },
        post_collection: {
          id: ['SA'],
          title: ['SA'],
        },
      },
      dataBases: {
        _main: Post,
        user: User,
        group: Group,
        post_collection: PostCollection,
      },
      dataSource: this.dataSource,
      FE_permission: {
        create: ['admin', 'founder'],
        update: ['admin', 'founder'],
        delete: ['admin', 'founder'],
        take: ['member', 'admin', 'founder'],
      },
    });
  }

  // ==================== Private ====================

  private buildRelationFields(
    requester_id: string,
    group_id: string,
    collection_id: string,
  ) {
    return {
      user: { id: requester_id },
      group: { id: group_id },
      post_collection: { id: collection_id },
    };
  }

  /**
   * `getRole()` trả enum CHỮ HOA ('ADMIN' | 'FOUNDER' | 'MEMBER') còn label của
   * FilterDbField là chữ thường. Trước đây truyền thẳng role vào
   * `buildQueryObject` nên KHÔNG match label nào → `select` rỗng → TypeORM trả
   * về TOÀN BỘ cột, tức là rò rỉ `correct_answer` cho học viên.
   */
  private async resolveReadLabel(input: {
    group_id: string;
    requester_id: string;
  }): Promise<string> {
    const role = await this.groupMemberService.getRole({
      group_id: input.group_id,
      user_id: input.requester_id,
      error_msg: 'not_a_member',
    });
    return String(role).toLowerCase();
  }

  private withPermission<T extends object>(post: T, label: string) {
    const filtered = this.filterByLabels.filterDataOfQueryResult({
      object: post as Record<string, any>,
      label,
    });
    return {
      ...filtered,
      permission: this.filterByLabels.getLabelPermission(label),
    };
  }

  // ==================== Check ====================

  private async checkBeforeCreate(input: {
    group_id: string;
    collection_id: string;
    requester_id: string;
  }) {
    const { group_id, collection_id, requester_id } = input;

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

    return poster_role as string;
  }

  // ==================== Create ====================

  async createPost(input: {
    group_id: string;
    collection_id: string;
    requester_id: string;
    body: CreatePostDto;
  }) {
    const { group_id, collection_id, requester_id, body } = input;

    const poster_role = await this.checkBeforeCreate({
      group_id,
      collection_id,
      requester_id,
    });

    const post = await this.postRepo.save({
      title: body.title,
      description: body.description ?? null,
      content: body.content,
      correct_answer: body.correct_answer ?? null,
      retake: body.retake ?? Retake.NEVER,
      deadline_at: body.deadline_at ? new Date(body.deadline_at) : null,
      view_each_other_answer:
        body.view_each_other_answer ?? View_Each_Other_Answer.NEVER,
      ...this.buildRelationFields(requester_id, group_id, collection_id),
    });

    await this.notifyNewPost({
      post,
      group_id,
      collection_id,
      poster_id: requester_id,
    });

    return this.withPermission(post, poster_role.toLowerCase());
  }

  /**
   * Tạo post từ kho question_preparation của chính người giao bài.
   * COPY nội dung sang post — sau này sửa kho cá nhân không ảnh hưởng đề trong nhóm.
   */
  async createPostFromPreparation(input: {
    group_id: string;
    collection_id: string;
    requester_id: string;
    body: CreatePostFromPreparationDto;
  }) {
    const { group_id, collection_id, requester_id, body } = input;

    const poster_role = await this.checkBeforeCreate({
      group_id,
      collection_id,
      requester_id,
    });

    const preparation = await this.preparationRepo.findOne({
      where: { id: body.preparation_id, user: { id: requester_id } },
      select: {
        id: true,
        title: true,
        content: true,
        correct_answer: true,
      },
    });

    if (!preparation)
      throw new NotFoundException({ errorCode: 'preparation_not_found' });

    const post = await this.postRepo.save({
      title: body.title ?? preparation.title,
      description: body.description ?? null,
      content: preparation.content,
      correct_answer: preparation.correct_answer,
      retake: body.retake ?? Retake.NEVER,
      deadline_at: body.deadline_at ? new Date(body.deadline_at) : null,
      view_each_other_answer:
        body.view_each_other_answer ?? View_Each_Other_Answer.NEVER,
      ...this.buildRelationFields(requester_id, group_id, collection_id),
    });

    await this.notifyNewPost({
      post,
      group_id,
      collection_id,
      poster_id: requester_id,
    });

    return this.withPermission(post, poster_role.toLowerCase());
  }

  /** Báo cho cả nhóm (trừ người giao bài) khi có bài tập mới */
  private async notifyNewPost(input: {
    post: Post;
    group_id: string;
    collection_id: string;
    poster_id: string;
  }) {
    try {
      const memberIds = await this.groupMemberService.getMemberUserIds(
        input.group_id,
      );
      if (memberIds.length === 0) return;

      const group = await this.dataSource.getRepository(Group).findOne({
        where: { id: input.group_id },
        select: { id: true, name: true },
      });

      await this.notifService.sendMany({
        user_ids: memberIds,
        exclude_user_id: input.poster_id,
        type: User_Notif_Type.NEW_POST,
        content: {
          group_id: input.group_id,
          group_name: group?.name ?? '',
          collection_id: input.collection_id,
          post_id: input.post.id,
          title: input.post.title,
        },
      });
    } catch {
      // thông báo lỗi KHÔNG được làm hỏng việc giao bài
    }
  }

  // ==================== Read - One ====================

  async findOne(input: {
    group_id: string;
    collection_id: string;
    post_id: string;
    requester_id: string;
  }) {
    const { group_id, collection_id, post_id, requester_id } = input;

    const label = await this.resolveReadLabel({ group_id, requester_id });
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label,
    });

    const post = await this.postRepo.findOne({
      where: {
        id: post_id,
        group: { id: group_id },
        post_collection: { id: collection_id },
      },
      relations,
      select,
    });

    if (!post) throw new NotFoundException({ errorCode: 'post_not_found' });

    // Học viên CHƯA làm bài thì không được thấy đáp án; đã làm rồi thì trả về
    // để tự so sánh. (Yêu cầu: post trả cho member chưa làm KHÔNG có correct answer.)
    if (label === 'member') {
      const hasAnswered = await this.answerRepo.exists({
        where: { post: { id: post_id }, user: { id: requester_id } },
      });
      if (!hasAnswered) delete (post as Record<string, any>).correct_answer;
    }

    return { ...post, permission: this.filterByLabels.getLabelPermission(label) };
  }

  // ==================== Read - Many ====================

  async findMany(input: {
    group_id: string;
    collection_id: string;
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { group_id, collection_id, requester_id, page, limit } = input;

    const label = await this.resolveReadLabel({ group_id, requester_id });
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label,
    });

    const posts = await this.postRepo.find({
      where: {
        group: { id: group_id },
        post_collection: { id: collection_id },
      },
      relations,
      select,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    const permission = this.filterByLabels.getLabelPermission(label);

    return posts.map((post) => {
      const item = { ...post, permission } as Record<string, any>;

      // DANH SÁCH không bao giờ trả đáp án cho member — kể cả đã làm bài.
      // Muốn so đáp án thì mở chi tiết post (findOne kiểm tra đã làm hay chưa).
      if (label === 'member') delete item.correct_answer;

      return item;
    });
  }

  // ==================== Update ====================

  /**
   * Chỉ sửa được title / description / deadline_at / view_each_other_answer.
   * Nội dung câu hỏi và `retake` bị chặn ở tầng DTO để không phá bài làm cũ.
   */
  /**
   * Hạn chót mới phải ở TƯƠNG LAI — TRỪ khi giữ nguyên đúng hạn đang lưu.
   *
   * Ngoại lệ này là bắt buộc: sửa tiêu đề của một bài đã hết hạn vẫn gửi kèm
   * hạn cũ, nếu chặn thì sau khi hết hạn sẽ không sửa được gì nữa.
   */
  private async assertDeadlineIsFutureOrUnchanged(input: {
    post_id: string;
    group_id: string;
    collection_id: string;
    deadline_at?: string;
  }) {
    const { post_id, group_id, collection_id, deadline_at } = input;

    if (deadline_at === undefined) return; // không đụng tới hạn

    const next = deadline_at ? new Date(deadline_at).getTime() : null;

    // bỏ hạn, hoặc hạn ở tương lai -> hợp lệ
    if (next === null || Number.isNaN(next) || next > Date.now()) return;

    const current = await this.postRepo.findOne({
      where: {
        id: post_id,
        group: { id: group_id },
        post_collection: { id: collection_id },
      },
      select: { id: true, deadline_at: true },
    });

    const currentTime = current?.deadline_at
      ? new Date(current.deadline_at).getTime()
      : null;

    if (currentTime !== null && currentTime === next) return; // giữ nguyên hạn cũ

    throw new BadRequestException({ errorCode: 'deadline_must_be_future' });
  }

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

    await this.assertDeadlineIsFutureOrUnchanged({
      post_id,
      group_id,
      collection_id,
      deadline_at: body.deadline_at,
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

    // trả post đã update để FE cache đúng ngay, khỏi refetch
    return this.findOne({
      group_id,
      collection_id,
      post_id,
      requester_id,
    });
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

  async adminFindOne(input: { post_id: string }) {
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });
    const post = await this.postRepo.findOne({
      where: { id: input.post_id },
      relations,
      select,
    });
    if (!post) throw new NotFoundException({ errorCode: 'post_not_found' });
    return post;
  }

  /**
   * Danh sách bài tập cho admin, có lọc.
   *
   * Trả kèm quan hệ đã join: người giao bài (`user`), nhóm (`group`),
   * bộ sưu tập (`post_collection`) — FE hiển thị trực tiếp không cần gọi thêm.
   */
  async adminFindMany(query: AdminPostQueryDto) {
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.postRepo.findAndCount({
      where: adminWhere({
        id: adminUuidLike(query.id),
        title: adminLike(query.title),
        group: { id: adminUuidLike(query.group_id) },
        post_collection: { id: adminUuidLike(query.collection_id) },
        user: { user_name: adminLike(query.user_name) },
        created_at: adminCreatedRange(query),
      }),
      relations,
      select,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      withDeleted: query.with_deleted === true,
    });

    return adminPage({ items: items.map(markDeleted), total, page, limit });
  }

  /** Khôi phục một bài tập đã bị xoá mềm */
  async adminRestore(post_id: string) {
    const result = await this.postRepo.restore({ id: post_id });

    if (!result.affected)
      throw new NotFoundException({
        errorCode: 'post_not_found_or_not_deleted',
      });

    return this.adminFindOne({ post_id });
  }

  async adminUpdate(input: { post_id: string; body: UpdatePostDto }) {
    const result = await this.postRepo.update({ id: input.post_id }, input.body);
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'post_not_found' });
    return true;
  }

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
