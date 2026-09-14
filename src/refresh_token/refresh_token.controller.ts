import {
  Controller,
  Get,
  UseGuards, Headers
} from '@nestjs/common';
import { TokenService } from './refresh_token.service.js';
import { Public } from '../_common/decorators/method/public.decorator.js';
import { RefreshTokenGuard } from '../_other_module/guards/refresh_token_guard.service.js';

@Controller('refresh-token')
export class RefreshTokenController {
  constructor(private readonly tokenService: TokenService) {}

  // @Get()
  // @Public()
  // @UseGuards(RefreshTokenGuard)
  // regetAccessToken(
  //     @Headers('authorization') authorization: string
  // ) {
  //   const refreshToken = authorization.replace('Bearer ', '');
  //   return this.refreshTokenService.regetAccessToken(refreshToken);
  // }
}
