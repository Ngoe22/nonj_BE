import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post as HttpPost,
  Query,
} from '@nestjs/common';

import { PostService } from '../post.service.js';
import {
  CreatePostDto,
  CreatePostFromPreparationDto,
  UpdatePostDto,
} from '../dto/post.dto.js';
import { GetRequesterInfo } from '../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../_common/types/request.js';
import { ParseLimitPipe } from '../../_common/pipe/ParseLimitPipe.js';

/**
 * Post trong nhóm — LUÔN nằm trong ngữ cảnh group + collection.
 *
 * Trước đây controller khai `@Controller('post')` nhưng handler lại đọc
 * `@Param('group_id')` / `@Param('collection_id')` không tồn tại trong path nên
 * 2 giá trị đó luôn `undefined` → mọi API post đều không dùng được.
 */
@Controller('group/:group_id/collection/:collection_id/post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  // ---------------- Create ----------------

  /** Soạn thủ công ngay trong nhóm */
  @HttpPost()
  create(
    @Param('group_id') group_id: string,
    @Param('collection_id') collection_id: string,
    @Body() body: CreatePostDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.postService.createPost({
      group_id,
      collection_id,
      requester_id: requester.id,
      body,
    });
  }

  /** Lấy từ kho question_preparation của chính mình — BE copy nội dung sang */
  @HttpPost('from_preparation')
  createFromPreparation(
    @Param('group_id') group_id: string,
    @Param('collection_id') collection_id: string,
    @Body() body: CreatePostFromPreparationDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.postService.createPostFromPreparation({
      group_id,
      collection_id,
      requester_id: requester.id,
      body,
    });
  }

  // ---------------- Read ----------------

  @Get()
  getMany(
    @Param('group_id') group_id: string,
    @Param('collection_id') collection_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.postService.findMany({
      group_id,
      collection_id,
      requester_id: requester.id,
      page,
      limit,
    });
  }

  @Get(':post_id')
  getOne(
    @Param('group_id') group_id: string,
    @Param('collection_id') collection_id: string,
    @Param('post_id') post_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.postService.findOne({
      group_id,
      collection_id,
      post_id,
      requester_id: requester.id,
    });
  }

  // ---------------- Update / Delete ----------------

  @Patch(':post_id')
  update(
    @Param('group_id') group_id: string,
    @Param('collection_id') collection_id: string,
    @Param('post_id') post_id: string,
    @Body() body: UpdatePostDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.postService.update({
      group_id,
      collection_id,
      post_id,
      requester_id: requester.id,
      body,
    });
  }

  @Delete(':post_id')
  delete(
    @Param('group_id') group_id: string,
    @Param('collection_id') collection_id: string,
    @Param('post_id') post_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.postService.softDelete({
      group_id,
      collection_id,
      post_id,
      requester_id: requester.id,
    });
  }
}
