import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './controller/user.controller.js';
import {TypeOrmModule} from "@nestjs/typeorm";
import { User} from "./entities/user.entity.js";
import { AdminUserController } from './controller/admin-user.controller.js';
import {FriendRequestModule} from "../friend_request/friend_request.module.js";
import { StorageModule } from '../storage/storage.module.js';
import { AppConfigModule } from '../app_config/app_config.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([User]) , FriendRequestModule,
    StorageModule,
    AppConfigModule,
  ],
  controllers: [UserController, AdminUserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}


//   imports: [TypeOrmModule.forFeature([])] ,