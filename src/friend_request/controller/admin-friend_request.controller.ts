import {
    Controller,
    Get,
    Patch,
    Delete,
    Param,
    Query,
    UseGuards,
    DefaultValuePipe,
    ParseIntPipe,
} from '@nestjs/common';
import { FriendRequestService } from '../friend_request.service.js';
import { AdminFriendRequestQueryDto } from '../dto/admin-friend-request-query.dto.js';
import { UserGuard } from '../../_other_module/guards/user.guard.js';
import { User_Role } from '../../user/enums/user.enum.js';
import { ParseLimitPipe } from '../../_common/pipe/ParseLimitPipe.js';

@Controller('admin/friend_request')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminFriendReqController {
    constructor(private readonly friendRequestService: FriendRequestService) {}


    @Get('')
    adminGetMany(@Query() query: AdminFriendRequestQueryDto) {
        return this.friendRequestService.adminFindMany(query);
    }

    @Get(':request_id')
    adminGetOne(
        @Param('request_id') request_id: string,
    ) {
        return this.friendRequestService.admin_get_one_request({ request_id });
    }


    @Get(':sender_id/outgoing')
    getOutgoingByUser(
        @Param('sender_id') sender_id: string,
        @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    ) {
        return this.friendRequestService.admin_get_many_user_sending_request( { sender_id, limit , page }  ) ;
    }

    @Get(':receiver_id/ingoing')
    getIngoingByUser(
        @Param('receiver_id') receiver_id: string,
        @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    ) {
        return this.friendRequestService.admin_get_many_user_receiving_request({receiver_id, limit, page });
    }




    /** Khôi phục quan hệ đã bị xoá mềm */
    @Patch('restore/:request_id')
    restore(@Param('request_id') request_id: string) {
        return this.friendRequestService.adminRestore(request_id);
    }

    @Delete(':request_id')
    forceDelete(@Param('request_id') request_id: string) {
        return this.friendRequestService.admin_soft_delete(request_id);
    }
}