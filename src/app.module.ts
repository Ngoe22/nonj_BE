import { Module } from '@nestjs/common';
// import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserModule } from './user/user.module.js';
import { PostModule } from './post/post.module.js';
import {ConfigModule} from "@nestjs/config";
import {TypeOrmModule} from "@nestjs/typeorm";
import {User} from "./user/entities/user.entity.js";
import { RefreshTokenModule } from './refresh_token/refresh_token.module.js';
import { UserNotifModule } from './user_notif/user_notif.module.js';
import { ReportModule } from './report/report.module.js';
import { FriendRequestModule } from './friend_request/friend_request.module.js';
import { FriendshipModule } from './friendship/friendship.module.js';
import { GroupModule } from './group/group.module.js';
import { PostAnswerModule } from './post_answer/post_answer.module.js';
import { UserExerciseTemplateModule } from './user_exercise_template/user_exercise_template.module.js';
import { UserSetting } from './user/entities/user_setting.entity.js';
import { UserExerciseTemplate } from './user_exercise_template/entities/user_exercise_template.entity.js';


@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      // entities: [User, UserSetting, UserExerciseTemplate ],
      autoLoadEntities: true ,
      synchronize: true,

    }),
    UserModule,
    PostModule,
    RefreshTokenModule,
    UserNotifModule,
    ReportModule,
    FriendRequestModule,
    FriendshipModule,
    GroupModule,
    PostAnswerModule,
    UserExerciseTemplateModule,
  ],
})
export class AppModule {}
