import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UserExerciseTemplateService } from '../user_exercise_template.service.js';
import {CreateExerciseTemplateDto, UpdateExerciseTemplateDto} from '../dto/user_exercise_template.dto.js';
import type { RequesterInfo } from '../../_common/types/request.js';
import { GetRequesterInfo } from '../../_common/decorators/param/request_payload.decorator.js';

@Controller('user_exercise_template')
export class UserExerciseTemplateController {
  constructor(
    private readonly exerciseTemplateService: UserExerciseTemplateService,
  ) {}

  // ================== EXERCISE TEMPLATE ==================

  @Get('/:id')
  get(@GetRequesterInfo() requester: RequesterInfo, @Param('id') id: string) {
    // friend service check relationship
    // setting service check xem co allow xem khong

    return this.exerciseTemplateService.findOne({
      template_id: id,
      user_id: requester.id,
      reqRole: requester.role,
    });
  }

  @Post()
  create(
    @Body() body: CreateExerciseTemplateDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.exerciseTemplateService.create({
      ...body,
      user: requester.id,
    });
  }

  @Patch(':exercise_template_id')
  edit(
    @Body() body: UpdateExerciseTemplateDto,
    @GetRequesterInfo() requester: RequesterInfo,
    @Param('template_id') template_id: string,
  ) {
    return this.exerciseTemplateService.update({
      body,
      user_id: requester.id,
      template_id,
    });
  }

  @Delete()
  delete(
    @GetRequesterInfo() requester: RequesterInfo,
    @Param('template_id') template_id: string,
  ) {
    return this.exerciseTemplateService.softDelete({
      user_id: requester.id,
      template_id,
    });
  }

  // ================== COLLECTION ==================
}
