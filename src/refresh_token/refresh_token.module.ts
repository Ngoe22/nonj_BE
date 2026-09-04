import { Module } from '@nestjs/common';
import { RefreshTokenService } from './refresh_token.service.js';
import { RefreshTokenController } from './refresh_token.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh_token.entity.js';
import { JwtConfigModule } from '../jwt/jwt.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken]), JwtConfigModule],
  controllers: [RefreshTokenController],
  providers: [RefreshTokenService],
  exports: [RefreshTokenService],
})
export class RefreshTokenModule {}
