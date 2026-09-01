import { Module } from '@nestjs/common';
import { UserExerciseTemplateService } from './user_exercise_template.service.js';
import { UserExerciseTemplateController } from './user_exercise_template.controller.js';
import {TypeOrmModule} from "@nestjs/typeorm";
import {UserExerciseTemplate} from "./entities/user_exercise_template.entity.js";
import {UserExerciseTemplateCollection} from "./entities/user_exercise_template_collection.entity.js";

@Module({
  controllers: [UserExerciseTemplateController],
  providers: [UserExerciseTemplateService],
 imports: [TypeOrmModule.forFeature([UserExerciseTemplate, UserExerciseTemplateCollection])   ],
})
export class UserExerciseTemplateModule {}
