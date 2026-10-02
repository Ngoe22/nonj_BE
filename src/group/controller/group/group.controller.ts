import { Public } from '../../../_common/decorators/method/public.decorator.js';
import { BadRequestException } from '@nestjs/common';
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
import { GroupService } from '../../service/group/group.service.js';
import { CreateGroupDto, UpdateGroupDto } from '../../dto/group.dto.js';
import { GetRequesterInfo } from '../../../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../../../_common/types/request.js';
import { ParseLimitPipe } from '../../../_common/pipe/ParseLimitPipe.js';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  /** Check slug đã bị dùng chưa (public — form tạo nhóm gọi trước khi submit) */
  @Public()
  @Post('check_existing/:slug')
  checkSlugExist(@Param('slug') slug: string) {
    // Regex PHẢI khớp `@Matches` ở Group entity (KHÔNG cho dấu `_`)
    if (!/^[a-zA-Z0-9]{1,50}$/.test(slug))
      throw new BadRequestException({ errorCode: 'invalid_slug_format' });

    return this.groupService.checkSlugExist(slug);
  }

  @Post()
  create(
    @Body() body: CreateGroupDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.groupService.create({ founder_id: requester.id, body });
  }

  @Get('slug_search/:slug')
  searchOneBySlug(
    @GetRequesterInfo() requester: RequesterInfo,
    @Param('slug') slug: string,
  ) {
    return this.groupService.searchOneBySlug({
      slug,
      requester_id: requester.id,
    });
  }

  @Get('id_search/:group_id')
  getOneById(
    @GetRequesterInfo() requester: RequesterInfo,
    @Param('group_id') group_id: string,
  ) {
    return this.groupService.getOneById({
      group_id,
      requester_id: requester.id,
    });
  }

  //

  @Get('name_search/:name')
  searchManyByName(
    @Param('name') name: string,
    @GetRequesterInfo() requester: RequesterInfo,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(8), ParseLimitPipe) limit: number,
  ) {
    return this.groupService.searchManyByName({
      name,
      requester_id: requester.id,
      page,
      limit,
    });
  }

  @Get('own')
  findMyOwnMany(
    @GetRequesterInfo() requester: RequesterInfo,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseLimitPipe) limit: number,
  ) {
    return this.groupService.findMyOwnMany({
      requester_id: requester.id,
      page,
      limit,
    });
  }

  @Get('joined')
  findManyJoined(
    @GetRequesterInfo() requester: RequesterInfo,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseLimitPipe) limit: number,
  ) {
    return this.groupService.findManyJoined({
      requester_id: requester.id,
      page,
      limit,
    });
  }

  @Patch(':group_id')
  update(
    @Param('group_id') group_id: string,
    @Body() body: UpdateGroupDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.groupService.update({
      group_id,
      founder_id: requester.id,
      body,
    });
  }

  @Delete(':group_id')
  delete(
    @Param('group_id') group_id: string,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.groupService.softDelete({ group_id, founder_id: requester.id });
  }


}
