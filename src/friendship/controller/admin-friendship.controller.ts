import {Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Patch, Query, UseGuards} from "@nestjs/common";
import {UserGuard} from "../../_other_module/guards/user.guard.js";
import {User_Role} from "../../user/enums/user.enum.js";
import {FriendshipService} from "../friendship.service.js";
import {ParseLimitPipe} from "../../_common/pipe/ParseLimitPipe.js";
import {AdminUpdateFriendshipDto} from "../dto/friendship.dto.js";
import {AdminFriendshipQueryDto} from "../dto/admin-friendship-query.dto.js";

// ==========================================

@Controller('admin/friendship')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminFriendReqController {
    constructor(private readonly friendshipService: FriendshipService) {}

    /** Tìm kiếm bạn bè trên TOÀN HỆ THỐNG */
    @Get()
    getMany(@Query() query: AdminFriendshipQueryDto) {
        return this.friendshipService.adminFindMany(query);
    }

    /** Khôi phục quan hệ bạn bè đã bị xoá mềm */
    @Patch('restore/:friendship_id')
    restore(@Param('friendship_id') friendship_id: string) {
        return this.friendshipService.adminRestore(friendship_id);
    }

    @Get(':user_id')
    getFriendsByUser(
        @Param('user_id') user_id: string,
        @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    ) {
        return this.friendshipService.getMany({
            user_id,
            limit,
            page,
        });
    }

    @Delete('')
    softDelete(
        @Body() body : AdminUpdateFriendshipDto
    ) {
        return this.friendshipService.delete(body);
    }

}