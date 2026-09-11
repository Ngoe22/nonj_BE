import { Module } from '@nestjs/common';
import { GroupService } from './service/group/group.service.js';
import { GroupController } from './controller/group/group.controller.js';
import {User} from "../user/entities/user.entity.js";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Group} from "./entities/group.entity.js";
import {GroupCollection} from "./entities/group_collection.entity.js";
import {GroupJoinRequest} from "./entities/group_join_request.entity.js";
import {GroupMember} from "./entities/group_member.entity.js";

@Module({
  controllers: [GroupController],
  providers: [GroupService  ],
  imports: [ TypeOrmModule.forFeature([Group , GroupMember ,GroupCollection , GroupJoinRequest])] ,
  exports: [ GroupService ]
})
export class GroupModule {}
