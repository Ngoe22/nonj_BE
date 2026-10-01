import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { UserGuard } from '../../../_other_module/guards/user.guard.js';
import { User_Role } from '../../../user/enums/user.enum.js';
import { UpdateQuestionPreparationDto } from '../../dto/question_preparation.dto.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../../_common/types/request.js';
import { ParseLimitPipe } from '../../../_common/pipe/ParseLimitPipe.js';
import { QuestionPreparationService } from '../../service/question_preparation.service.js';
import { AdminPreparationQueryDto } from '../../dto/admin-preparation-query.dto.js';

@Controller('admin/question_preparation')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminQuestionPreparationController {
  constructor(
    private readonly preparationService: QuestionPreparationService,
  ) {}

  /** Tìm kiếm kho đề trên TOÀN HỆ THỐNG */
  @Get()
  adminFindMany(@Query() query: AdminPreparationQueryDto) {
    return this.preparationService.adminFindMany(query);
  }

  /** Đề trong 1 bộ sưu tập của 1 người (drill-down) */
  @Get('users/:user_id/:collection_id')
  adminGetMany(
    @Param('collection_id') collection_id: string,
    @Param('user_id') user_id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.preparationService.adminGetMany({
      collection_id,
      user_id,
      page,
      limit,
    });
  }

  @Get(':preparation_id')
  adminGetOne(@Param('preparation_id') preparation_id: string) {
    return this.preparationService.adminGetOne({ preparation_id });
  }

  /**
   * Khôi phục đề đã bị xoá mềm.
   *
   * PHẢI khai TRƯỚC `@Patch(':user_id/:preparation_id')` — hai route cùng 2
   * segment, nếu để sau thì `:user_id` sẽ nuốt mất chữ 'restore'.
   */
  @Patch('restore/:preparation_id')
  restore(@Param('preparation_id') preparation_id: string) {
    return this.preparationService.adminRestore(preparation_id);
  }

  @Patch(':user_id/:preparation_id')
  update(
    @Body() body: UpdateQuestionPreparationDto,
    @Param('preparation_id') preparation_id: string,
    @Param('user_id') user_id: string,
  ) {
    return this.preparationService.adminUpdate({
      body,
      user_id,
      preparation_id,
    });
  }

  @Delete(':preparation_id')
  delete(
    @Param('preparation_id') preparation_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.preparationService.adminSoftDelete({
      admin_id: requester.id,
      preparation_id,
    });
  }
}
