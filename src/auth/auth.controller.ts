import {
  Body,
  Controller,
  Param,
  ParseEnumPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { CreateUserDto } from '../user/dto/create-user.dto.js';
import { LogoutRange } from './enum/auth.enum.js';

import { Public } from '../_common/decorators/method/public.decorator.js';
import { GetRequesterInfo } from '../_common/decorators/param/request_payload.decorator.js';
import { REFRESH_TOKEN_TTL_MS } from '../_common/constants/auth.constant.js';
import type { RequesterInfo } from '../_common/types/request.js';

import { RefreshTokenGuard } from '../_other_module/guards/refresh_token_guard.service.js';
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

    this.setRefreshCookie(res, refreshToken);
    return { info, accessToken };
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

    this.setRefreshCookie(res, refreshToken);
    return { info, accessToken };
  }

  // ============================ logout ============================

  @Post('logout/:range')
  async logout(
      @Res({ passthrough: true }) res: Response,
      @Param('range', new ParseEnumPipe(LogoutRange)) range: LogoutRange,
      @GetRequesterInfo() requester: RequesterInfo,
  ) {
    await this.authService.logout(requester, range);
    this.clearRefreshCookie(res);
    return { success: true };
  }

  // ============================ reset password ============================

  @Post('reset_password')
  async resetPassword(@Req() _req: Request) {
    // TODO
  }

  // ============================ refresh ============================

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  async regetRefreshToken(
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
  ) {
    const refresh_token = req.cookies?.['refresh_token'];
    if (!refresh_token)
      throw new UnauthorizedException({ errorCode: 'missing_refresh_token' });

    const { newAccessToken, newRefreshToken } =
        await this.tokenService.regetAccessToken(refresh_token);

    this.setRefreshCookie(res, newRefreshToken);
    return { newAccessToken };
  }

  // ============================ cookie helpers ============================

  private setRefreshCookie(res: Response, refresh_token: string) {
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: '/auth',
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
    });
  }
}