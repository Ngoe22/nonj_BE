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
    UseGuards
} from "@nestjs/common";
import {UserGuard} from "../../_other_module/guards/user.guard.js";
import {User_Role} from "../../user/enums/user.enum.js";
import {PostService} from "../post.service.js";
import {ParseLimitPipe} from "../../_common/pipe/ParseLimitPipe.js";
import {UpdatePostDto} from "../dto/post.dto.js";
import type {RequesterInfo} from "../../_common/types/request.js";
import {GetRequesterInfo} from "../../_common/decorators/param/request_payload.decorator.js";

// ==========================================================




@Controller('admin/post')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminPostController {
    constructor(private readonly postService: PostService) {}

    @Get('collection/:collection_id')
    getMany(
        @Param('collection_id') collection_id: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
    ) {
        return this.postService.adminFindMany({ collection_id, page, limit });
    }

    @Get(':post_id')
    getOne(@Param('post_id') post_id: string) {
        return this.postService.adminFindOne({ post_id });
    }

    @Patch(':post_id')
    update(@Param('post_id') post_id: string, @Body() body: UpdatePostDto) {
        return this.postService.adminUpdate({ post_id, body });
    }

    @Delete(':post_id')
    delete(@Param('post_id') post_id: string, @GetRequesterInfo() requester: RequesterInfo) {
        return this.postService.adminSoftDelete({ post_id, admin_id: requester.id });
    }
}