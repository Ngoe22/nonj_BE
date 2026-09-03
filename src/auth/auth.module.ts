import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity.js';
import { RefreshToken } from '../refresh_token/entities/refresh_token.entity.js';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' }, // access token ngắn hạn
    }),
    TypeOrmModule.forFeature([User, RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
