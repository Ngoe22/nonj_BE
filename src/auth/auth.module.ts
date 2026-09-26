import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { ForgetPasswordOtp } from './entities/forget_password_otp.entity.js';
import { RefreshTokenModule } from '../refresh_token/refresh_token.module.js';
import { UserModule } from '../user/user.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ForgetPasswordOtp]),
    RefreshTokenModule,
    UserModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [],
})
export class AuthModule {}
