import {Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Query, UseGuards} from "@nestjs/common";
import {UserGuard} from "../../_other_module/guards/user.guard.js";
import {User_Role} from "../../user/enums/user.enum.js";
import {FriendshipService} from "../friendship.service.js";
import {ParseLimitPipe} from "../../_common/pipe/ParseLimitPipe.js";
import {AdminUpdateFriendshipDto} from "../dto/friendship.dto.js";

// ==========================================

@Controller('admin/friendship')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminFriendReqController {
    constructor(private readonly friendshipService: FriendshipService) {}

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