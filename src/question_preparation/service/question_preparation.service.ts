import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { FilterDbField } from '../../_common/helper/filterQueryForRole.js';
import { QuestionPreparation } from '../entities/question_preparation.entity.js';
import { QuestionPreparationCollection } from '../entities/question_preparation_collection.entity.js';
import { User } from '../../user/entities/user.entity.js';
import { CreateQuestionPreparationDto } from '../dto/question_preparation.dto.js';
import { QuestionPreparationCollectionService } from './question_preparation_collection.service.js';

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

    const saveInfo = FilterDbField.turnObjInfoToRelationObjToSave(input, [
      'user',
      'collection',
    ]);
    const saved = await this.preparationRepo.save(saveInfo as any);

    return this.filterByLabels.filterDataOfQueryResult({
      object: saved,
      label: 'me',
    });
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

    const result = await this.preparationRepo.update(
      { user: { id: user_id }, id: preparation_id },
      { deleted_at: new Date(), deleted_by: user_id },
    );
    if (result.affected === 0) {
      throw new NotFoundException({
        errorCode: 'preparation_or_owner_not_found',
      });
    }
    return true;
  }

  // ==================================================================
  //                             ADMIN
  // ==================================================================

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

    const result = await this.preparationRepo.update(
      { user: { id: user_id }, id: preparation_id },
      body,
    );
    if (result.affected === 0) {
      throw new NotFoundException({
        errorCode: 'preparation_or_owner_not_found',
      });
    }
    return body;
  }

  async adminSoftDelete(input: { preparation_id: string; admin_id: string }) {
    const { preparation_id, admin_id } = input;
    const result = await this.preparationRepo.update(
      { id: preparation_id },
      { deleted_at: new Date(), deleted_by: admin_id },
    );
    if (result.affected === 0) {
      throw new NotFoundException({
        errorCode: 'preparation_or_owner_not_found',
      });
    }
    return true;
  }
}
