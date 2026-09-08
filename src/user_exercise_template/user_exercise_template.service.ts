import { Injectable } from '@nestjs/common';
import { CreateExerciseTemplateDto } from './dto/create-user_exercise_template.dto.js';
import { UpdateUserExerciseTemplateDto } from './dto/update-user_exercise_template.dto.js';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FilterDbField } from '../_common/helper/filterQueryForRole.js';
import { UserExerciseTemplate } from './entities/user_exercise_template.entity.js';
import { UserExerciseTemplateCollection } from './entities/user_exercise_template_collection.entity.js';

// =======================================


type CreateExerciseTemplateInput = CreateExerciseTemplateDto & {
  user: { id: string };
};

// =======================================



@Injectable()
export class UserExerciseTemplateService {
  private exerciseFilterByRole: FilterDbField<UserExerciseTemplate>;
  private collectionFilterByRole: FilterDbField<UserExerciseTemplateCollection>;

  constructor(
    @InjectRepository(UserExerciseTemplate)
    private readonly exerciseRepository: Repository<UserExerciseTemplate>,
    @InjectRepository(UserExerciseTemplateCollection)
    private readonly collectionRepository: Repository<UserExerciseTemplateCollection>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    // ============================== Filter DB & QueryField

    this.exerciseFilterByRole = new FilterDbField({
      keyAndLabels: {
        id: ['admin', 'me', 'other'],
        title: ['admin', 'me', 'other'],
        exercise_content: ['admin', 'me', 'other'],
        collection: ['admin', 'me', 'other'],
        user: ['admin', 'me', 'other'],
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

  create(body: CreateExerciseTemplateInput) {
    return 'This action adds a new userExerciseTemplate';
  }

  findAll() {
    return `This action returns all userExerciseTemplate`;
  }

  findOne(id: string) {
    return `This action returns a #${id} userExerciseTemplate`;
  }

  update(
    id: number,
    updateUserExerciseTemplateDto: UpdateUserExerciseTemplateDto,
  ) {
    return `This action updates a #${id} userExerciseTemplate`;
  }

  remove(id: number) {
    return `This action removes a #${id} userExerciseTemplate`;
  }
}
