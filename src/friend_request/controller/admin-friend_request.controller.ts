import {
    Controller,
    Get,
    Delete,
    Param,
    Query,
    UseGuards,
    DefaultValuePipe,
    ParseIntPipe,
} from '@nestjs/common';
import { FriendRequestService } from '../friend_request.service.js';
import { UserGuard } from '../../_other_module/guards/user.guard.js';
import { User_Role } from '../../user/enums/user.enum.js';
import { ParseLimitPipe } from '../../_common/pipe/ParseLimitPipe.js';

@Controller('admin/friend_request')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminFriendReqController {
    constructor(private readonly friendRequestService: FriendRequestService) {}

    @Get(':user_id/outgoing')
    getOutgoingByUser(
        @Param('user_id') user_id: string,
        @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    ) {
        return this.friendRequestService.get_many_request({
            user_id,
            limit,
            page,
            data_for_role: 'admin',
            type: 'outgoing_requests',
        });
    }

    @Get(':user_id/ingoing')
    getIngoingByUser(
        @Param('user_id') user_id: string,
        @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    ) {
        return this.friendRequestService.get_many_request({
            user_id,
            limit,
            page,
            data_for_role: 'admin',
            type: 'ingoing_requests',
        });
    }

    @Delete(':request_id')
    forceDelete(@Param('request_id') request_id: string) {
        return this.friendRequestService.admin_soft_delete(request_id);
    }
}