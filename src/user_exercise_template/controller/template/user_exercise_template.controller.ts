import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete, Query, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { UserExerciseTemplateService } from '../../service/user_exercise_template.service.js';
import {CreateExerciseTemplateDto, UpdateExerciseTemplateDto} from '../../dto/user_exercise_template.dto.js';
import type { RequesterInfo } from '../../../_common/types/request.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import {ParseLimitPipe} from "../../../_common/pipe/ParseLimitPipe.js";

@Controller('user_exercise_template')
export class UserExerciseTemplateController {
  constructor(
    private readonly exerciseTemplateService: UserExerciseTemplateService,
  ) {}

  // ================== EXERCISE TEMPLATE ==================

  @Get('me')
  getManyMine(
    @GetRequesterInfo() requester: RequesterInfo,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.exerciseTemplateService.findManyMine({
      user_id: requester.id,
      page,
      limit,
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

  @Patch(':collection_id/:exercise_template_id')
  update(
    @Body() body: UpdateExerciseTemplateDto,
    @GetRequesterInfo() requester: RequesterInfo,
    @Param('template_id') template_id: string,
    @Param('collection_id') collection_id: string,
  ) {
    return this.exerciseTemplateService.update({
      body,
      user_id: requester.id,
      collection_id ,
      template_id,
    });
  }

  @Delete('/:template_id')
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



// @Get('me/:template_id')
// getMine(
//   @GetRequesterInfo() requester: RequesterInfo,
//   @Param('template_id') template_id: string,
// ) {
//   return this.exerciseTemplateService.findOneMine({
//     template_id,
//     user_id: requester.id,
//   });
// }

// @Get(':user_id')
// getManyFromUser(
//     @GetRequesterInfo() requester: RequesterInfo,
//     @Param('user_id') user_id: string,
//     @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
//     @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
// ) {
//   return this.exerciseTemplateService.findManyFromUser({
//     owner_id: user_id,
//     requester_id: requester.id,
//     page,
//     limit,
//   });
// }
//
// @Get(':user_id/:template_id')
// getFromUser(
//     @GetRequesterInfo() requester: RequesterInfo,
//     @Param('user_id') user_id: string,
//     @Param('template_id') template_id: string,
// ) {
//   return this.exerciseTemplateService.findFromOtherUser({
//     template_id,
//     owner_id: user_id,
//     requester_id: requester.id,
//   });
// }
