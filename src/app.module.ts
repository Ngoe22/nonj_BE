import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UserModule } from './user/user.module.js';
import {ConfigModule} from "@nestjs/config";
import {TypeOrmModule} from "@nestjs/typeorm";
import { RefreshTokenModule } from './refresh_token/refresh_token.module.js';
import { UserNotifModule } from './user_notif/user_notif.module.js';
import { ReportModule } from './report/report.module.js';
import { FriendRequestModule } from './friend_request/friend_request.module.js';
import { FriendshipModule } from './friendship/friendship.module.js';
import { GroupModule } from './group/group.module.js';
import { PostAnswerModule } from './post_answer/post_answer.module.js';
import { QuestionPreparationModule } from './question_preparation/question_preparation.module.js';
import { AuthModule } from './auth/auth.module.js';
import { APP_GUARD } from '@nestjs/core';
import {
  TokenGuardModule,
} from './_other_module/guards/token_guard.module.js';
import { AccessTokenGuard } from './_other_module/guards/access_token_guard.service.js';
import { PostModule } from './post/post.module.js';
import { StorageModule } from './storage/storage.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { DataPurgeModule } from './_common/purge/data_purge.module.js';
import { AppConfigModule } from './app_config/app_config.module.js';



// ===========================================

@Module({
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AccessTokenGuard }],
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
      // Supabase (và hầu hết Postgres managed) BẮT BUỘC SSL.
      // Postgres local bằng docker thì không có SSL -> mặc định tắt,
      // bật bằng DB_SSL=true khi trỏ sang Supabase.
      ssl:
        process.env.DB_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
      // entities: [User, QuestionPreparation, QuestionPreparationCollection ],
      autoLoadEntities: true,
      // Supabase là DB thật: mặc định vẫn true để test nhanh, nhưng chỉ cần
      // đặt DB_SYNCHRONIZE=false là tắt được NGAY, không phải sửa code.
      //
      // ⚠️ Ở PRODUCTION phải là `false` (main.ts fail-fast nếu không): chỉ cần
      // quên là TypeORM tự ALTER/DROP cột -> mất dữ liệu thật. Schema production
      // do MIGRATION quản lý.
      synchronize: process.env.DB_SYNCHRONIZE !== 'false',

      // Schema production tạo/sửa bằng migration trong `src/migrations`
      // (`npm run migration:run`) — các file này được biên dịch sang `dist/migrations`.
      migrations: ['dist/migrations/*.js'],
      // Bật để BE TỰ chạy migration còn thiếu lúc khởi động. Production nên bật
      // (`DB_MIGRATIONS_RUN=true`) để deploy là schema tự đúng, không phải chạy
      // tay. Dev để trống vì đã có `synchronize`.
      migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
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
    QuestionPreparationModule,
    AuthModule,
    TokenGuardModule,
    StorageModule,
    // Cron dọn dữ liệu xoá mềm quá hạn (3h sáng mỗi ngày)
    ScheduleModule.forRoot(),
    DataPurgeModule,
    AppConfigModule,
  ],
})
export class AppModule {}
