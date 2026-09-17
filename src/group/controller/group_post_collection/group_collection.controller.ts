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
import { PostCollectionService } from '../../service/post_collection/post_collection.service.js';
import {
  CreatePostCollectionDto,
  UpdatePostCollectionDto,
} from '../../dto/group_post_collection.dto.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../../_common/types/request.js';
import { ParseLimitPipe } from '../../../_common/pipe/ParseLimitPipe.js';

@Controller('group/:group_id/collection')
export class GroupCollectionController {
  constructor(private readonly collectionService: PostCollectionService) {}

  @Post()
  create(
    @Param('group_id') group_id: string,
    @Body() body: CreatePostCollectionDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.collectionService.create({
      group_id,
      requester_id: requester.id,
      body,
    });
  }

  @Get()
  getMany(
    @Param('group_id') group_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.collectionService.findMany({
      group_id,
      requester_id: requester.id,
      page,
      limit,
    });
  }


  @Patch(':collection_id')
  update(
    @Param('group_id') group_id: string,
    @Param('collection_id') collection_id: string,
    @Body() body: UpdatePostCollectionDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.collectionService.update({
      collection_id,
      requester_id: requester.id,
      body,
      group_id,
    });
  }

  @Delete(':collection_id')
  delete(
    @Param('group_id') group_id: string,
    @Param('collection_id') collection_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.collectionService.softDelete({
      collection_id,
      requester_id: requester.id,
      group_id,
    });
  }
}


// @Get(':collection_id')
// getOne(
//   @Param('group_id') group_id: string,
//   @Param('collection_id') collection_id: string,
//   @GetRequesterInfo() requester: RequesterInfo,
// ) {
//
//   return this.collectionService.findOne({
//     collection_id,
//     requester_id: requester.id,
//     group_id,
//   });
// }
