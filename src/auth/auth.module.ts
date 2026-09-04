import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { RefreshTokenModule } from '../refresh_token/refresh_token.module.js';
import { UserModule } from '../user/user.module.js';

@Module({
  imports: [RefreshTokenModule ,UserModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [],
})
export class AuthModule {}
