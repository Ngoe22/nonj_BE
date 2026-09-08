import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './controller/user.controller.js';
import {TypeOrmModule} from "@nestjs/typeorm";
import { User} from "./entities/user.entity.js";
import {UserSetting} from "./entities/user_setting.entity.js";
import { AdminUserController } from './controller/admin-user.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserSetting])],
  controllers: [UserController, AdminUserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}


//   imports: [TypeOrmModule.forFeature([])] ,