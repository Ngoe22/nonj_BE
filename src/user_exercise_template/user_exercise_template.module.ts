import { Module } from '@nestjs/common';
import { UserExerciseTemplateService } from './service/user_exercise_template.service.js';
import { UserExerciseTemplateController } from './controller/template/user_exercise_template.controller.js';
import {TypeOrmModule} from "@nestjs/typeorm";
import {UserExerciseTemplate} from "./entities/user_exercise_template.entity.js";
import {UserExerciseTemplateCollection} from "./entities/user_exercise_template_collection.entity.js";
import {UserModule} from "../user/user.module.js";
import {FriendshipModule} from "../friendship/friendship.module.js";
import {UserExerciseTemplateCollectionService} from "./service/user_exercise_template_collection.service.js";

@Module({
  controllers: [UserExerciseTemplateController],
  providers: [UserExerciseTemplateService , UserExerciseTemplateCollectionService],
 imports: [TypeOrmModule.forFeature([UserExerciseTemplate, UserExerciseTemplateCollection]) , UserModule , FriendshipModule  ],
})
export class UserExerciseTemplateModule {}
