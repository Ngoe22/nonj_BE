import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { UserGuard } from '../../../_other_module/guards/user.guard.js';
import { User_Role } from '../../../user/enums/user.enum.js';
import { QuestionPreparationCollectionService } from '../../service/question_preparation_collection.service.js';
import { UpdateQuestionPreparationCollectionDto } from '../../dto/question_preparation_collection.dto.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../../_common/types/request.js';

@Controller('admin/question_preparation_collection')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminQuestionPreparationCollectionController {
  constructor(
    private readonly collectionService: QuestionPreparationCollectionService,
  ) {}

  // khai route 2 segment TRƯỚC route 1 segment cho rõ ràng
  @Get('user/:user_id')
  adminFindMany(@Param('user_id') user_id: string) {
    return this.collectionService.adminFindMany({
      user_id,
      page: 1,
      limit: 100,
    });
  }

  @Get(':collection_id')
  adminFindOne(@Param('collection_id') collection_id: string) {
    return this.collectionService.adminFindOne({ collection_id });
  }

  @Patch(':collection_id')
  update(
    @Body() body: UpdateQuestionPreparationCollectionDto,
    @Param('collection_id') collection_id: string,
  ) {
    return this.collectionService.adminUpdate({ collection_id, body });
  }

  @Delete(':collection_id')
  delete(
    @Param('collection_id') collection_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.collectionService.adminSoftDelete({
      collection_id,
      admin_id: requester.id,
    });
  }
}
