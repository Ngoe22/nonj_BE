import { Module } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import {TypeOrmModule} from "@nestjs/typeorm";
import { User} from "./entities/user.entity.js";
import {UserSetting} from "./entities/user_setting.entity.js";

@Module({
  imports: [TypeOrmModule.forFeature([User,UserSetting])] ,
  controllers: [UserController],
  providers: [UserService ],
  exports: [],
})
export class UserModule {}


//   imports: [TypeOrmModule.forFeature([])] ,