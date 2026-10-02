import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { FilterDbField } from '../../_common/helper/filterQueryForRole.js';
import { AdminPreparationQueryDto } from '../dto/admin-preparation-query.dto.js';
import {
  adminCreatedRange,
  adminLike,
  adminPage,
  adminUuidLike,
  markDeleted,
  adminWhere,
} from '../../_common/helper/admin_query.helper.js';
import { QuestionPreparation } from '../entities/question_preparation.entity.js';
import { QuestionPreparationCollection } from '../entities/question_preparation_collection.entity.js';
import { User } from '../../user/entities/user.entity.js';
import { CreateQuestionPreparationDto } from '../dto/question_preparation.dto.js';
import { QuestionPreparationCollectionService } from './question_preparation_collection.service.js';
import { StorageRefService } from '../../storage/storage_ref.service.js';
import { AppConfigService } from '../../app_config/app_config.service.js';

type CreateQuestionPreparationInput = CreateQuestionPreparationDto & {
  user: string;
};

/**
 * Đề cá nhân tự soạn. TƯ NHÂN — không có nhánh chia sẻ cho bạn bè hay người
 * khác, nên chỉ tồn tại 2 label: `SA` (admin) và `me` (chủ sở hữu).
 * Mọi truy vấn đều khoá cứng theo user_id của requester.
 */
@Injectable()
export class QuestionPreparationService {
  private filterByLabels: FilterDbField<
    QuestionPreparation | User | QuestionPreparationCollection,
    string
  >;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(QuestionPreparation)
    private readonly preparationRepo: Repository<QuestionPreparation>,
    private readonly collectionService: QuestionPreparationCollectionService,
    private readonly storageRef: StorageRefService,
    private readonly appConfig: AppConfigService,
  ) {
    this.filterByLabels = FilterDbField.create({
      labels: ['SA', 'me'],
      fieldAndLabels: {
        id: ['SA', 'me'],
        title: ['SA', 'me'],
        content: ['SA', 'me'],
        correct_answer: ['SA', 'me'],
        created_at: ['SA', 'me'],
        deleted_at: ['SA'],
        user: {
          id: ['SA', 'me'],
          user_name: ['SA', 'me'],
          nickname: ['SA', 'me'],
          avatar_url: ['SA', 'me'],
        },
        collection: {
          id: ['SA', 'me'],
          title: ['SA', 'me'],
        },
      },
      dataBases: {
        _main: QuestionPreparation,
        user: User,
        collection: QuestionPreparationCollection,
      },
      dataSource: this.dataSource,
      FE_permission: {
        create: ['me'],
        update: ['me'],
        delete: ['me'],
      },
    });
  }

  // ==================== Private ====================

  private async findOne(input: { condition: object; data_for: string }) {
    const { condition, data_for } = input;

    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: data_for,
    });

    const preparation = await this.preparationRepo.findOne({
      where: condition,
      relations,
      select,
    });
    if (!preparation)
      throw new NotFoundException({ errorCode: 'preparation_not_found' });
    return preparation;
  }

  private async findMany(input: {
    collection_id: string;
    user_id: string;
    data_for: string;
    page: number;
    limit: number;
  }) {
    const { collection_id, user_id, data_for, page, limit } = input;

    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: data_for,
    });

    return this.preparationRepo.find({
      where: {
        user: { id: user_id },
        collection: { id: collection_id },
      },
      relations,
      select,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  // ==================== Get many ====================

  async findOneMine(input: {
    user_id: string;
    preparation_id: string;
    collection_id: string;
  }) {
    const { user_id, preparation_id, collection_id } = input;
    return this.findOne({
      condition: {
        id: preparation_id,
        user: { id: user_id },
        collection: { id: collection_id },
      },
      data_for: 'me',
    });
  }

  async findManyMine(input: {
    collection_id: string;
    user_id: string;
    page: number;
    limit: number;
  }) {
    const { collection_id, user_id, page, limit } = input;
    return this.findMany({
      collection_id,
      user_id,
      data_for: 'me',
      page,
      limit,
    });
  }

  // ==================== Create ====================

  async create(input: CreateQuestionPreparationInput) {
    const isMine = await this.collectionService.isCollectionBelongToUser({
      collection_id: input.collection,
      user_id: input.user,
    });
    if (!isMine)
      throw new NotFoundException({
        errorCode: 'collection_not_belong_to_user',
      });

    await this.assertMediaLimit(input.content);

    const saveInfo = FilterDbField.turnObjInfoToRelationObjToSave(input, [
      'user',
      'collection',
    ]);
    const saved = await this.preparationRepo.save(saveInfo as any);

    await this.storageRef.syncContentReferences(null, input.content);

    return this.filterByLabels.filterDataOfQueryResult({
      object: saved,
      label: 'me',
    });
  }

  // ==================== Media limit + ref-count helpers ====================

  private async assertMediaLimit(content: unknown): Promise<void> {
    const limits = await this.appConfig.getMediaLimits();
    const count = this.storageRef.countMedia(content);
    if (count.images > limits.images)
      throw new BadRequestException({
        errorCode: 'too_many_images',
        max: limits.images,
        current: count.images,
      });
    if (count.audio > limits.audio)
      throw new BadRequestException({
        errorCode: 'too_many_audio',
        max: limits.audio,
        current: count.audio,
      });
  }

  private async loadPrepContent(preparation_id: string): Promise<unknown> {
    const prep = await this.preparationRepo.findOne({
      where: { id: preparation_id },
      select: { content: true },
    });
    return prep?.content ?? null;
  }

  // ==================== Update ====================

  async update(input: {
    user_id: string;
    preparation_id: string;
    collection_id: string;
    body: any;
  }) {
    const { user_id, preparation_id, collection_id, body } = input;

    // Không cho đổi collection sang thư mục của người khác
    if (body.collection) {
      const check = await this.collectionService.isCollectionBelongToUser({
        collection_id: body.collection,
        user_id,
      });
      if (!check)
        throw new NotFoundException({
          errorCode: 'collection_not_belong_to_user',
        });
      body.collection = { id: body.collection };
    }

    const oldContent = await this.loadPrepContent(preparation_id);
    if (body.content !== undefined) await this.assertMediaLimit(body.content);

    const result = await this.preparationRepo.update(
      {
        user: { id: user_id },
        id: preparation_id,
        collection: { id: collection_id },
      },
      body,
    );
    if (result.affected === 0) {
      throw new NotFoundException({
        errorCode: 'preparation_or_owner_not_found',
      });
    }

    if (body.content !== undefined)
      await this.storageRef.syncContentReferences(oldContent, body.content);

    return this.findOne({
      condition: {
        id: preparation_id,
        user: { id: user_id },
        collection: { id: collection_id },
      },
      data_for: 'me',
    });
  }

  // ==================== Delete ====================

  async softDelete(input: { user_id: string; preparation_id: string }) {
    const { user_id, preparation_id } = input;

    const oldContent = await this.loadPrepContent(preparation_id);

    const result = await this.preparationRepo.update(
      { user: { id: user_id }, id: preparation_id },
      { deleted_at: new Date(), deleted_by: user_id },
    );
    if (result.affected === 0) {
      throw new NotFoundException({
        errorCode: 'preparation_or_owner_not_found',
      });
    }

    await this.storageRef.syncContentReferences(oldContent, null);
    return true;
  }

  // ==================================================================
  //                             ADMIN
  // ==================================================================

  /**
   * Danh sách kho đề cá nhân cho admin, có lọc.
   * Trả kèm chủ sở hữu (`user`) và bộ sưu tập (`collection`).
   */
  async adminFindMany(query: AdminPreparationQueryDto) {
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.preparationRepo.findAndCount({
      where: adminWhere({
        id: adminUuidLike(query.id),
        title: adminLike(query.title),
        user: { user_name: adminLike(query.user_name) },
        collection: { id: adminUuidLike(query.collection_id) },
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

  /** Khôi phục một đề đã bị xoá mềm */
  async adminRestore(preparation_id: string) {
    const result = await this.preparationRepo.restore({ id: preparation_id });

    if (!result.affected)
      throw new NotFoundException({
        errorCode: 'preparation_not_found_or_not_deleted',
      });

    await this.storageRef.syncContentReferences(
      null,
      await this.loadPrepContent(preparation_id),
    );

    return this.adminGetOne({ preparation_id });
  }

  async adminGetOne(input: { preparation_id: string }) {
    // trước đây query `{ template_id }` — sai tên field nên luôn not found
    return this.findOne({
      condition: { id: input.preparation_id },
      data_for: 'SA',
    });
  }

  async adminGetMany(input: {
    collection_id: string;
    user_id: string;
    page: number;
    limit: number;
  }) {
    const { collection_id, user_id, page, limit } = input;

    return this.findMany({
      collection_id,
      user_id,
      data_for: 'SA',
      limit,
      page,
    });
  }

  async adminUpdate(input: {
    user_id: string;
    preparation_id: string;
    body: any;
  }) {
    const { user_id, preparation_id, body } = input;

    const oldContent = await this.loadPrepContent(preparation_id);
    if (body.content !== undefined) await this.assertMediaLimit(body.content);

    const result = await this.preparationRepo.update(
      { user: { id: user_id }, id: preparation_id },
      body,
    );
    if (result.affected === 0) {
      throw new NotFoundException({
        errorCode: 'preparation_or_owner_not_found',
      });
    }

    if (body.content !== undefined)
      await this.storageRef.syncContentReferences(oldContent, body.content);
    return body;
  }

  async adminSoftDelete(input: { preparation_id: string; admin_id: string }) {
    const { preparation_id, admin_id } = input;

    const oldContent = await this.loadPrepContent(preparation_id);

    const result = await this.preparationRepo.update(
      { id: preparation_id },
      { deleted_at: new Date(), deleted_by: admin_id },
    );
    if (result.affected === 0) {
      throw new NotFoundException({
        errorCode: 'preparation_or_owner_not_found',
      });
    }

    await this.storageRef.syncContentReferences(oldContent, null);
    return true;
  }
}
