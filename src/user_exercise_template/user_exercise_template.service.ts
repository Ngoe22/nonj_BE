import {ForbiddenException, Injectable, NotFoundException} from '@nestjs/common';
import {
  CreateExerciseTemplateDto,
  DeleteExerciseTemplateDto,
  UpdateExerciseTemplateDto
} from './dto/user_exercise_template.dto.js';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {DataSource, DeepPartial, QueryDeepPartialEntity, Repository} from 'typeorm';
import { FilterDbField } from '../_common/helper/filterQueryForRole.js';
import { UserExerciseTemplate } from './entities/user_exercise_template.entity.js';
import { UserExerciseTemplateCollection } from './entities/user_exercise_template_collection.entity.js';
import { User_Role } from '../user/enums/user.enum.js';

// =======================================


type CreateExerciseTemplateInput = CreateExerciseTemplateDto & {
  user: string;
};



// =======================================



@Injectable()
export class UserExerciseTemplateService {
  private exerciseFilterByRole: FilterDbField<UserExerciseTemplate>;
  private collectionFilterByRole: FilterDbField<UserExerciseTemplateCollection>;

  constructor(
    @InjectRepository(UserExerciseTemplate)
    private readonly templateRepo: Repository<UserExerciseTemplate>,
    @InjectRepository(UserExerciseTemplateCollection)
    private readonly collectionRepo: Repository<UserExerciseTemplateCollection>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    // ============================== Filter DB & QueryField

    this.exerciseFilterByRole = new FilterDbField({
      keyAndLabels: {
        id: ['system_admin', 'me', 'other'],
        title: ['system_admin', 'me', 'other'],
        exercise_content: ['system_admin', 'me', 'other'],
        collection: ['system_admin', 'me', 'other'],
        user: ['system_admin', 'me', 'other'],
      },
      dataBase: UserExerciseTemplate,
      dataSource,
    });

    this.collectionFilterByRole = new FilterDbField({
      keyAndLabels: {
        id: ['admin', 'me', 'other'],
        title: ['admin', 'me', 'other'],
      },
      dataBase: UserExerciseTemplateCollection,
      dataSource,
    });
  }

  // ================== EXERCISE TEMPLATE ==================

  findAll() {
    return `This action returns all userExerciseTemplate`;
  }

  async findOne(input: {
    template_id: string;
    user_id: string;
    reqRole: User_Role;
  }) {

    const { template_id, user_id, reqRole } = input;
    const tableName = 'user_exercise_template';
    const selectArray = this.exerciseFilterByRole.buildQuerySelectArray({
      label: 'admin',
      tableName,
    });
    const result = await this.templateRepo
      .createQueryBuilder(tableName)
      .select(selectArray)
      .where({ id: template_id })
      .andWhere(`${tableName}.deleted_at IS NULL`)
      .getRawOne();

    if (!result) {
      throw new NotFoundException({ errorCode: 'template_not_found' });
    }

    return result;

    // const returnTo = result.user.id === user_id ? 'me' : 'other';
    // return this.exerciseFilterByRole.filterDataOfQueryResult({
    //   object: result,
    //   label: returnTo,
    // });
  }

  async create(input: CreateExerciseTemplateInput) {
    await this.isCollectionBelongToUser({
      collection_id: input.collection,
      user_id: input.user,
    });
    const saveInfo = FilterDbField.turnObjInfoToRelationObj(input, [
      'user',
      'collection',
    ]) as DeepPartial<UserExerciseTemplate>;
    return this.templateRepo.save(saveInfo);
  }

  async update(input: {
    user_id: string;
    template_id: string;
    body: UpdateExerciseTemplateDto | DeleteExerciseTemplateDto;
  }) {
    const { user_id, template_id, body } = input;
    const result = await this.templateRepo.update(
      { user: { id: user_id }, id: template_id },
      body as QueryDeepPartialEntity<UserExerciseTemplate>,
    );
    if (result.affected === 0) {
      throw new NotFoundException({ errorCode: 'template_or_owner_not_found' });
    }
    return body;
  }

  async softDelete(input: { user_id: string; template_id: string }) {
    const { user_id, template_id } = input;
    return await this.update({
      user_id,
      template_id,
      body: { deleted_at: new Date(), deleted_by: input.user_id },
    });
  }

  // ================== COLLECTION ==================








  // ================== PRIVATE ==================

  private async isCollectionBelongToUser(input: {
    collection_id: string;
    user_id: string;
  }) {
    const { collection_id, user_id } = input;
    const collection = await this.collectionRepo.findOne({
      where: { id: collection_id, user: { id: user_id } },
    });

    if (!collection)
      throw new ForbiddenException({
        errorCode: 'collection_not_found_or_not_owned',
      });
  }
}
