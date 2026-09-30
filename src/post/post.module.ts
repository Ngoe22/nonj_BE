import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PostController } from './controller/post.controller.js';
import { PostService } from './post.service.js';
import { AdminPostController } from './controller/admin-post.controller.js';
import { UserModule } from '../user/user.module.js';
import { GroupModule } from '../group/group.module.js';
import { Post } from './entities/post.entity.js';
import { QuestionPreparation } from '../question_preparation/entities/question_preparation.entity.js';
import { PostAnswer } from '../post_answer/entities/post_answer.entity.js';

import { UserNotifModule } from '../user_notif/user_notif.module.js';
@Module({
  imports: [
    UserNotifModule,
    TypeOrmModule.forFeature([Post, QuestionPreparation, PostAnswer]),
    UserModule,
    GroupModule,
  ],
  controllers: [PostController, AdminPostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
