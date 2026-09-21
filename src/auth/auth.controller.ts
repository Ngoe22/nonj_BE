import {
  Body,
  Controller,
  Param,
  ParseEnumPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { CreateUserDto } from '../user/dto/create-user.dto.js';
import { LogoutRange } from './enum/auth.enum.js';

import { Public } from '../_common/decorators/method/public.decorator.js';
import { GetRequesterInfo } from '../_common/decorators/param/request_payload.decorator.js';
import type { RequesterInfo } from '../_common/types/request.js';
import { REFRESH_COOKIE_NAME } from '../_common/constants/auth.constant.js';
import {
  setAccessCookie,
  setRefreshCookie,
  clearAuthCookies,
} from '../_common/helper/cookie.helper.js';

import { TokenService } from '../refresh_token/refresh_token.service.js';

@Controller('auth')
export class AuthController {
  constructor(
      private readonly authService: AuthService,
      private readonly tokenService: TokenService,
  ) {}

  // ============================ register ============================

  @Public()
  @Post('register')
  async register(
      @Body() body: CreateUserDto,
      @Res({ passthrough: true }) res: Response,
  ) {
    const { info, accessToken, refreshToken } =
        await this.authService.register(body);

    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);

    return { info }; // ⬅️ KHÔNG trả token
  }

  // ============================ login ============================

  @Public()
  @Post('login')
  async login(
      @Body() body: LoginDto,
      @Res({ passthrough: true }) res: Response,
  ) {
    const { info, accessToken, refreshToken } =
        await this.authService.login(body);

    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);

    return { info }; // ⬅️ KHÔNG trả token
  }

  // ============================ logout ============================

  @Post('logout/:range')
  async logout(
      @Res({ passthrough: true }) res: Response,
      @Param('range', new ParseEnumPipe(LogoutRange)) range: LogoutRange,
      @GetRequesterInfo() requester: RequesterInfo,
  ) {
    await this.authService.logout(requester, range);
    clearAuthCookies(res); // ⬅️ xoá cả 2 cookie
    return { success: true };
  }

  // ============================ refresh ============================

  @Public()
  @Post('refresh')
  async refresh(
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken)
      throw new UnauthorizedException({
        errorCode: 'refresh_token_not_found',
      });

    const { newAccessToken, newRefreshToken } =
        await this.tokenService.regetAccessToken(refreshToken);

    setAccessCookie(res, newAccessToken);
    setRefreshCookie(res, newRefreshToken);

    return { success: true }; // ⬅️ KHÔNG trả token
  }

  @Post('reset_password')
  async resetPassword(@Req() _req: Request) {
    // TODO
  }
}