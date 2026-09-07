// auth.module.ts
import { Module } from '@nestjs/common';
import { AccessTokenGuard } from './access_token_guard.service.js';
import { RefreshTokenModule } from '../../refresh_token/refresh_token.module.js';
import { RefreshTokenGuard } from './refresh_token_guard.service.js';

@Module({
  imports: [RefreshTokenModule],
  providers: [AccessTokenGuard , RefreshTokenGuard],
  exports: [AccessTokenGuard, RefreshTokenGuard], // để module khác dùng lại được nếu cần
})
export class TokenGuardModule {}
