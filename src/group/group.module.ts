import { Module } from '@nestjs/common';
import { GroupService } from './service/group/group.service.js';
import { GroupController } from './controller/group/group.controller.js';
import {User} from "../user/entities/user.entity.js";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Group} from "./entities/group.entity.js";
import {GroupCollection} from "./entities/group_collection.entity.js";
import {GroupJoinRequest} from "./entities/group_join_request.entity.js";
import {GroupMember} from "./entities/group_member.entity.js";
import {GroupMemberService} from "./service/group_member/group_member.service.js";
import {GroupJoinRequestService} from "./service/group_join_request/group_join_request.service.js";
import {GroupCollectionService} from "./service/group_collection/group_collection.service.js";
import {AdminGroupController} from "./controller/group/admin-group.controller.js";
import {AdminGroupCollectionController} from "./controller/group_collection/admin-group_collection.controller.js";
import {GroupCollectionController} from "./controller/group_collection/group_collection.controller.js";
import {GroupJoinRequestController} from "./controller/group_join_request/group_join_request.controller.js";
import {AdminGroupJoinRequestController} from "./controller/group_join_request/admin-group_join_request.controller.js";
import {GroupMemberController} from "./controller/group_member/group_member.controller.js";
import {AdminGroupMemberController} from "./controller/group_member/admin-group_member.controller.js";

@Module({
  controllers: [GroupController , AdminGroupController ,GroupCollectionController , AdminGroupCollectionController , GroupJoinRequestController,AdminGroupJoinRequestController ,GroupMemberController ,AdminGroupMemberController],
  providers: [GroupService ,GroupMemberService ,GroupJoinRequestService , GroupCollectionService ],
  imports: [ TypeOrmModule.forFeature([Group , GroupMember ,GroupCollection , GroupJoinRequest])] ,
  exports: [ GroupService ,GroupMemberService , GroupJoinRequestService , GroupCollectionService ]
})
export class GroupModule {}
