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


    @Get('')
    adminGetMany(
        @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    ) {
        return this.friendRequestService.admin_get_many_request({ limit, page });
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




    @Delete(':request_id')
    forceDelete(@Param('request_id') request_id: string) {
        return this.friendRequestService.admin_soft_delete(request_id);
    }
}