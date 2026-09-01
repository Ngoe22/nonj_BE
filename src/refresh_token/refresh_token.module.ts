import { Module } from '@nestjs/common';
import { RefreshTokenService } from './refresh_token.service.js';
import { RefreshTokenController } from './refresh_token.controller.js';

@Module({
  controllers: [RefreshTokenController],
  providers: [RefreshTokenService],
})
export class RefreshTokenModule {}
