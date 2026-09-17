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
import { PostCollectionService } from '../../service/post_collection/post_collection.service.js';
import { ParseLimitPipe } from '../../../_common/pipe/ParseLimitPipe.js';
import { UpdatePostCollectionDto } from '../../dto/group_post_collection.dto.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../../_common/types/request.js';

@Controller('admin/post_collection')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminGroupCollectionController {
  constructor(private readonly collectionService: PostCollectionService) {}

  @Get('group/:group_id')
  getMany(
    @Param('group_id') group_id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.collectionService.adminFindMany({ group_id, page, limit });
  }

  @Get(':collection_id')
  getOne(@Param('collection_id') collection_id: string) {
    return this.collectionService.adminFindOne({ collection_id });
  }

  @Patch(':collection_id')
  update(
    @Param('collection_id') collection_id: string,
    @Body() body: UpdatePostCollectionDto,
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
