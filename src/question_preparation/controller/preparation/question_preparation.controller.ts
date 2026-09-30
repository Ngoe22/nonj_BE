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

import { QuestionPreparationService } from '../../service/question_preparation.service.js';
import {
  CreateQuestionPreparationDto,
  UpdateQuestionPreparationDto,
} from '../../dto/question_preparation.dto.js';
import type { RequesterInfo } from '../../../_common/types/request.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import { ParseLimitPipe } from '../../../_common/pipe/ParseLimitPipe.js';

/** Đề tự soạn của chính mình. Tư nhân — mọi route đều scope theo requester. */
@Controller('question_preparation')
export class QuestionPreparationController {
  constructor(
    private readonly preparationService: QuestionPreparationService,
  ) {}

  @Get('me/:collection_id')
  getManyMine(
    @GetRequesterInfo() requester: RequesterInfo,
    @Param('collection_id') collection_id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.preparationService.findManyMine({
      collection_id,
      user_id: requester.id,
      page,
      limit,
    });
  }

  @Get('me/:collection_id/:preparation_id')
  getOneMine(
    @GetRequesterInfo() requester: RequesterInfo,
    @Param('collection_id') collection_id: string,
    @Param('preparation_id') preparation_id: string,
  ) {
    return this.preparationService.findOneMine({
      preparation_id,
      collection_id,
      user_id: requester.id,
    });
  }

  @Post()
  create(
    @Body() body: CreateQuestionPreparationDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.preparationService.create({
      ...body,
      user: requester.id,
    });
  }

  @Patch(':collection_id/:preparation_id')
  update(
    @Body() body: UpdateQuestionPreparationDto,
    @GetRequesterInfo() requester: RequesterInfo,
    @Param('collection_id') collection_id: string,
    @Param('preparation_id') preparation_id: string,
  ) {
    return this.preparationService.update({
      body,
      user_id: requester.id,
      collection_id,
      preparation_id,
    });
  }

  @Delete(':preparation_id')
  delete(
    @GetRequesterInfo() requester: RequesterInfo,
    @Param('preparation_id') preparation_id: string,
  ) {
    return this.preparationService.softDelete({
      user_id: requester.id,
      preparation_id,
    });
  }
}
