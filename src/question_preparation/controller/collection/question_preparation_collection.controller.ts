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

import { QuestionPreparationCollectionService } from '../../service/question_preparation_collection.service.js';
import {
  CreateQuestionPreparationCollectionDto,
  UpdateQuestionPreparationCollectionDto,
} from '../../dto/question_preparation_collection.dto.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../../_common/types/request.js';
import { ParseLimitPipe } from '../../../_common/pipe/ParseLimitPipe.js';

/** Thư mục đề tự soạn của chính mình. */
@Controller('question_preparation_collection')
export class QuestionPreparationCollectionController {
  constructor(
    private readonly collectionService: QuestionPreparationCollectionService,
  ) {}

  @Post()
  create(
    @Body() body: CreateQuestionPreparationCollectionDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.collectionService.create({ user_id: requester.id, body });
  }

  @Get('me')
  getManyMine(
    @GetRequesterInfo() requester: RequesterInfo,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.collectionService.findManyMine({
      user_id: requester.id,
      page,
      limit,
    });
  }

  @Get('me/:collection_id')
  getMine(
    @GetRequesterInfo() requester: RequesterInfo,
    @Param('collection_id') collection_id: string,
  ) {
    return this.collectionService.findMine({
      collection_id,
      user_id: requester.id,
    });
  }

  @Patch('me/:collection_id')
  update(
    @Body() body: UpdateQuestionPreparationCollectionDto,
    @Param('collection_id') collection_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.collectionService.update({
      user_id: requester.id,
      collection_id,
      body,
    });
  }

  @Delete('me/:collection_id')
  delete(
    @Param('collection_id') collection_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.collectionService.softDelete({
      user_id: requester.id,
      collection_id,
    });
  }
}
