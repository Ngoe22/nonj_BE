import { PostController } from './controller/post.controller.js';
import { PostService } from './post.service.js';
import { AdminPostController } from './controller/admin-post.controller.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module.js';
import { GroupModule } from '../group/group.module.js';
import { Post } from './entities/post.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Post]), UserModule, GroupModule],
  controllers: [PostController, AdminPostController],
  providers: [PostService],
  exports: [PostService],
})
export class PostModule {}
