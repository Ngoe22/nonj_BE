// auth.module.ts
import { Module } from '@nestjs/common';
import { AccessTokenGuardService } from './access_token_guard.service.js';
import { RefreshTokenModule } from '../../refresh_token/refresh_token.module.js';
import { RefreshTokenGuardService } from './refresh_token_guard.service.js';

@Module({
  imports: [RefreshTokenModule],
  providers: [AccessTokenGuardService, RefreshTokenGuardService],
  exports: [AccessTokenGuardService, RefreshTokenGuardService], // để module khác dùng lại được nếu cần
})
export class TokenGuardModule {}
