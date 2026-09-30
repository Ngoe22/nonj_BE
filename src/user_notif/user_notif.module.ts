import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserNotif } from './entities/user_notif.entity.js';
import { UserNotifController } from './controller/user_notif.controller.js';
import { UserNotifService } from './user_notif.service.js';
import { NotifGateway } from './user_notif.gateway.js';
import { RefreshTokenModule } from '../refresh_token/refresh_token.module.js';

/**
 * Thông báo trong app.
 *
 * Gateway cần `TokenService` để validate cookie ở handshake -> import
 * RefreshTokenModule (module này export TokenService).
 * Không dùng JwtModule nữa vì secret phải khớp JWT_ACCESS_SECRET.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserNotif]), RefreshTokenModule],
  controllers: [UserNotifController],
  providers: [UserNotifService, NotifGateway],
  exports: [UserNotifService],
})
export class UserNotifModule {}
