import { Module } from '@nestjs/common';
import { PostAnswerService } from './post_answer.service.js';
import { PostAnswerController } from './controller/post_answer.controller.js';
import {PostAnswer} from "./entities/post_answer.entity.js";
import {TypeOrmModule} from "@nestjs/typeorm";
import { GroupMemberService } from '../group/service/group_member/group_member.service.js';
import { GroupModule } from '../group/group.module.js';

@Module({
  controllers: [PostAnswerController],
  providers: [PostAnswerService],
  imports: [TypeOrmModule.forFeature([PostAnswer]), GroupModule],
})
export class PostAnswerModule {}
