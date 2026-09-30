import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { FilterDbField } from '../../_common/helper/filterQueryForRole.js';
import { QuestionPreparationCollection } from '../entities/question_preparation_collection.entity.js';
import {
  CreateQuestionPreparationCollectionDto,
  UpdateQuestionPreparationCollectionDto,
} from '../dto/question_preparation_collection.dto.js';

/**
 * Thư mục cá nhân chứa đề tự soạn.
 *
 * KHÔNG có nhánh chia sẻ: `question_preparation` là tư nhân nên chỉ tồn tại
 * label `SA` (admin) và `me` (chủ sở hữu). Mọi truy vấn đều khoá theo user_id.
 */
@Injectable()
export class QuestionPreparationCollectionService {
  filterByLabels: FilterDbField<QuestionPreparationCollection, string>;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(QuestionPreparationCollection)
    private readonly collectionRepo: Repository<QuestionPreparationCollection>,
  ) {
    this.filterByLabels = FilterDbField.create({
      labels: ['SA', 'me'],
      fieldAndLabels: {
        id: ['SA', 'me'],
        title: ['SA', 'me'],
        desc: ['SA', 'me'],
        created_at: ['SA', 'me'],
      },
      dataBases: {
        _main: QuestionPreparationCollection,
      },
      dataSource: this.dataSource,
      FE_permission: {
        update: ['me'],
        delete: ['me'],
      },
    });
  }

  // ==================== Check ====================

  async isCollectionBelongToUser(input: {
    collection_id: string;
    user_id: string;
  }): Promise<boolean> {
    const { collection_id, user_id } = input;
    return this.collectionRepo.exists({
      where: { id: collection_id, user: { id: user_id } },
    });
  }

  // ================= private  =================

  private async findOne(input: { condition: object; data_for: string }) {
    const { condition, data_for } = input;

    const { select } = this.filterByLabels.buildQueryObject({
      label: data_for,
    });

    const collection = await this.collectionRepo.findOne({
      where: condition,
      select,
    });

    if (!collection) {
      throw new NotFoundException({ errorCode: 'collection_not_found' });
    }
    return collection;
  }

  private async findMany(input: {
    condition: object;
    data_for: string;
    page: number;
    limit: number;
  }) {
    const { condition, data_for, page, limit } = input;

    const { select } = this.filterByLabels.buildQueryObject({
      label: data_for,
    });

    return this.collectionRepo.find({
      where: condition,
      select,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  // ==================== Get - One ====================

  async findMine(input: { collection_id: string; user_id: string }) {
    const { collection_id, user_id } = input;
    return this.findOne({
      condition: { id: collection_id, user: { id: user_id } },
      data_for: 'me',
    });
  }

  // ==================== Get - Many ====================

  async findManyMine(input: { user_id: string; page: number; limit: number }) {
    const { user_id, page, limit } = input;
    return this.findMany({
      condition: { user: { id: user_id } },
      data_for: 'me',
      page,
      limit,
    });
  }

  // ==================== Create ====================

  async create(input: {
    user_id: string;
    body: CreateQuestionPreparationCollectionDto;
  }) {
    const { user_id, body } = input;

    const saved = await this.collectionRepo.save({
      title: body.title,
      desc: body.desc,
      user: { id: user_id },
    });

    return this.filterByLabels.filterDataOfQueryResult({
      object: saved,
      label: 'me',
    });
  }

  // ==================== Update ====================

  async update(input: {
    user_id: string;
    collection_id: string;
    body: UpdateQuestionPreparationCollectionDto;
  }) {
    const { user_id, collection_id, body } = input;

    const result = await this.collectionRepo.update(
      { id: collection_id, user: { id: user_id } },
      body,
    );
    if (result.affected === 0)
      throw new NotFoundException({
        errorCode: 'collection_or_owner_not_found',
      });

    return this.findMine({ collection_id, user_id });
  }

  // ==================== Delete ====================

  async softDelete(input: { user_id: string; collection_id: string }) {
    const { user_id, collection_id } = input;

    const result = await this.collectionRepo.update(
      { id: collection_id, user: { id: user_id } },
      { deleted_at: new Date(), deleted_by: user_id },
    );

    if (result.affected === 0) {
      throw new NotFoundException({
        errorCode: 'collection_or_owner_not_found',
      });
    }
    return true;
  }

  // ==============================================================
  //                             ADMIN
  // ==============================================================

  async adminFindOne(input: { collection_id: string }) {
    const { collection_id } = input;
    return this.findOne({
      condition: { id: collection_id },
      data_for: 'SA',
    });
  }

  async adminFindMany(input: { user_id: string; page: number; limit: number }) {
    const { user_id, page, limit } = input;
    return this.findMany({
      condition: { user: { id: user_id } },
      data_for: 'SA',
      page,
      limit,
    });
  }

  async adminUpdate(input: {
    collection_id: string;
    body: UpdateQuestionPreparationCollectionDto;
  }) {
    const { collection_id, body } = input;

    const result = await this.collectionRepo.update(
      { id: collection_id },
      body,
    );

    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'collection_not_found' });
    return true;
  }

  async adminSoftDelete(input: { collection_id: string; admin_id: string }) {
    const { collection_id, admin_id } = input;

    const result = await this.collectionRepo.update(
      { id: collection_id },
      { deleted_at: new Date(), deleted_by: admin_id },
    );

    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'collection_not_found' });
    return true;
  }
}
