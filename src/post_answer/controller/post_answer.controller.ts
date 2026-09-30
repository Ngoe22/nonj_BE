import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { PostAnswerService } from '../post_answer.service.js';
import {
  CreatePostAnswerDto,
  GradePostAnswerDto,
} from '../dto/post_answer.dto.js';
import { GetRequesterInfo } from '../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../_common/types/request.js';
import { ParseLimitPipe } from '../../_common/pipe/ParseLimitPipe.js';

@Controller('group/:group_id/collection/:collection_id/post/:post_id/answer')
export class PostAnswerController {
  constructor(private readonly answerService: PostAnswerService) {}

  // ---------------- Create ----------------

  @Post()
  create(
    @Param('group_id') group_id: string,
    @Param('collection_id') collection_id: string,
    @Param('post_id') post_id: string,
    @Body() body: CreatePostAnswerDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.answerService.create({
      group_id,
      collection_id,
      post_id,
      requester_id: requester.id,
      body,
    });
  }

  // ---------------- Read ----------------

  /**
   * Bài làm CỦA MÌNH. Trả `null` khi chưa làm (không phải 404) để FE phân biệt
   * được "chưa làm" với "lỗi thật".
   *
   * PHẢI khai TRƯỚC `@Get(':answer_id')`, nếu không `/me` sẽ bị nuốt bởi
   * `:answer_id` và rơi vào nhánh xem bài của người khác.
   */
  @Get('me')
  getMine(
    @Param('group_id') group_id: string,
    @Param('post_id') post_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.answerService.findMine({
      group_id,
      post_id,
      requester_id: requester.id,
    });
  }

  @Get()
  getMany(
    @Param('group_id') group_id: string,
    @Param('collection_id') collection_id: string,
    @Param('post_id') post_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.answerService.findOthersMany({
      group_id,
      collection_id,
      post_id,
      requester_id: requester.id,
      page,
      limit,
    });
  }

  @Get(':answer_id')
  getOne(
    @Param('group_id') group_id: string,
    @Param('collection_id') collection_id: string,
    @Param('post_id') post_id: string,
    @Param('answer_id') answer_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.answerService.findOthersOne({
      group_id,
      collection_id,
      post_id,
      answer_id,
      requester_id: requester.id,
    });
  }

  // ---------------- Update ----------------

  @Patch('retake/:answer_id')
  retake(
    @Param('answer_id') answer_id: string,
    @Body() body: CreatePostAnswerDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.answerService.exerciseMulChoiceRetake({
      user_id: requester.id,
      answer_id,
      body,
    });
  }

  @Patch(':answer_id/grade')
  grade(
    @Param('group_id') group_id: string,
    @Param('collection_id') collection_id: string,
    @Param('post_id') post_id: string,
    @Param('answer_id') answer_id: string,
    @Body() body: GradePostAnswerDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.answerService.grade({
      group_id,
      collection_id,
      post_id,
      answer_id,
      grader_id: requester.id,
      body,
    });
  }

  // ---------------- Delete ----------------

  @Delete(':answer_id')
  delete(
    @Param('group_id') group_id: string,
    @Param('collection_id') collection_id: string,
    @Param('post_id') post_id: string,
    @Param('answer_id') answer_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.answerService.softDelete({
      group_id,
      collection_id,
      post_id,
      answer_id,
      requester_id: requester.id,
    });
  }
}
