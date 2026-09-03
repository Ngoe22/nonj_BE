import { Module } from '@nestjs/common';
import { RefreshTokenService } from './refresh_token.service.js';
import { RefreshTokenController } from './refresh_token.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh_token.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken])], // phải có dòng này
  controllers: [RefreshTokenController],
  providers: [RefreshTokenService],
})
export class RefreshTokenModule {}
