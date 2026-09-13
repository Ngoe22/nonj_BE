import { Module } from '@nestjs/common';
import { PostAnswerService } from './post_answer.service.js';
import { PostAnswerController } from './controller/post_answer.controller.js';
import {PostAnswer} from "./entities/post_answer.entity.js";
import {TypeOrmModule} from "@nestjs/typeorm";

@Module({
  controllers: [PostAnswerController],
  providers: [PostAnswerService],
  imports: [TypeOrmModule.forFeature([PostAnswer])] ,
})
export class PostAnswerModule {}
