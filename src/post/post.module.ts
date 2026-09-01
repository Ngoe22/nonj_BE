import { Module } from '@nestjs/common';
import { PostService } from './post.service.js';
import { PostController } from './post.controller.js';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Post} from "./entities/post.entity.js";

@Module({
  controllers: [PostController],
  providers: [PostService],
  imports: [TypeOrmModule.forFeature([Post])] ,
})
export class PostModule {}
