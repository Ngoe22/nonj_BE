import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { UserExerciseTemplateService } from './user_exercise_template.service.js';
import { CreateExerciseTemplateDto } from './dto/create-user_exercise_template.dto.js';
import type { JwtPayload } from '../_common/types/request.js';
import { RequestPayload } from '../_common/decorators/param/request_payload.decorator.js';

@Controller('user_exercise_template')
export class UserExerciseTemplateController {
  constructor(
    private readonly exerciseTemplateService: UserExerciseTemplateService,
  ) {}

  @Get("/:exercise_template_id")
  get(
    @RequestPayload() req: JwtPayload ,
    @Param("exercise_template_id") exerciseTemplateId: string
  ) {
    return this.exerciseTemplateService.findOne(exerciseTemplateId);
  }

  @Post()
  create(
    @Body() body: CreateExerciseTemplateDto,
    @RequestPayload() payload: JwtPayload,
  ) {
    return this.exerciseTemplateService.create({
      ...body,
      user: { id: payload.id },
    });
  }

  @Patch()
  edit() {}

  @Delete()
  delete() {}
}
