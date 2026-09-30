import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QuestionPreparation } from './entities/question_preparation.entity.js';
import { QuestionPreparationCollection } from './entities/question_preparation_collection.entity.js';
import { QuestionPreparationService } from './service/question_preparation.service.js';
import { QuestionPreparationCollectionService } from './service/question_preparation_collection.service.js';
import { QuestionPreparationController } from './controller/preparation/question_preparation.controller.js';
import { AdminQuestionPreparationController } from './controller/preparation/admin-question_preparation.controller.js';
import { QuestionPreparationCollectionController } from './controller/collection/question_preparation_collection.controller.js';
import { AdminQuestionPreparationCollectionController } from './controller/collection/admin-question_preparation_collection.controller.js';

/**
 * Đề tự soạn của cá nhân (tư nhân).
 *
 * Không import UserModule / FriendshipModule nữa: trước đây chúng chỉ phục vụ
 * nhánh chia sẻ `who_can_see_my_template` đã bị xoá.
 */
@Module({
  controllers: [
    QuestionPreparationController,
    AdminQuestionPreparationController,
    QuestionPreparationCollectionController,
    AdminQuestionPreparationCollectionController,
  ],
  providers: [QuestionPreparationService, QuestionPreparationCollectionService],
  imports: [
    TypeOrmModule.forFeature([
      QuestionPreparation,
      QuestionPreparationCollection,
    ]),
  ],
  exports: [QuestionPreparationService, QuestionPreparationCollectionService],
})
export class QuestionPreparationModule {}
