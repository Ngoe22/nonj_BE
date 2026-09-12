import {Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Patch, Post, Query} from "@nestjs/common";
import {PostService} from "./post.service.js";
import {CreatePostDto, UpdatePostDto} from "./dto/post.dto.js";
import {GetRequesterInfo} from "../_common/decorators/param/request_payload.decorator.js";
import type {RequesterInfo} from "../_common/types/request.js";
import {ParseLimitPipe} from "../_common/pipe/ParseLimitPipe.js";

// ==========================================================



@Controller('group/:group_id/collection/:collection_id/post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  create(
      @Param('group_id') group_id: string,
      @Param('collection_id') collection_id: string,
      @Body() body: CreatePostDto,
      @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.postService.create({ group_id, collection_id, requester_id: requester.id, body });
  }

  @Get()
  getMany(
      @Param('group_id') group_id: string,
      @Param('collection_id') collection_id: string,
      @GetRequesterInfo() requester: RequesterInfo,
      @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
      @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.postService.findMany({ group_id, collection_id, requester_id: requester.id, page, limit });
  }

  @Get(':post_id')
  getOne(
      @Param('group_id') group_id: string,
      @Param('collection_id') collection_id: string,
      @Param('post_id') post_id: string,
      @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.postService.findOne({ group_id, collection_id, post_id, requester_id: requester.id });
  }

  @Patch(':post_id')
  update(
      @Param('group_id') group_id: string,
      @Param('collection_id') collection_id: string,
      @Param('post_id') post_id: string,
      @Body() body: UpdatePostDto,
      @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.postService.update({ group_id, collection_id, post_id, requester_id: requester.id, body });
  }

  @Delete(':post_id')
  delete(
      @Param('group_id') group_id: string,
      @Param('collection_id') collection_id: string,
      @Param('post_id') post_id: string,
      @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.postService.softDelete({ group_id, collection_id, post_id, requester_id: requester.id });
  }
}