import {
  Body,
  Controller,
  Get, Headers,
  NotFoundException,
  Param, ParseEnumPipe,
  Post,
  Req, Res, UnauthorizedException, UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import express from 'express';
import {Public} from "../_common/decorators/method/public.decorator.js";
import type { Request, Response } from 'express';
import {ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS} from "../_common/constants/auth.constant.js";
import {RefreshTokenGuard} from "../_other_module/guards/refresh_token_guard.service.js";
import {TokenService} from "../refresh_token/refresh_token.service.js";
import {GetRequesterInfo} from "../_common/decorators/param/request_payload.decorator.js";
import type {RequesterInfo} from "../_common/types/request.js";
import {LogoutRange} from "./enum/auth.enum.js";
import {CreateUserDto} from "../user/dto/create-user.dto.js";

@Controller('auth')
export class AuthController {
  constructor(
      private authService: AuthService ,
      private tokenService: TokenService
  ) {}

  @Public()
  @Post('/register')
  async register(
      @Body() body: CreateUserDto ,
      @Res({ passthrough: true }) res: Response
) {
    const { info , accessToken , refreshToken } = await this.authService.register(body);

    this.setAccessCookie(res, accessToken);
    this.setRefreshCookie(res, refreshToken);

    return info;
  }

  @Public()
  @Post('login')
  async login(

      @Body() body: LoginDto ,
      @Res({ passthrough: true }) res: Response
  ) {
    const { info , accessToken , refreshToken } = await this.authService.login(body);

    this.setAccessCookie(res, accessToken);
    this.setRefreshCookie(res, refreshToken);

    return info;
  }

  // ---------------------------------------

  @Post('logout/:range')
  async logout(
    @Res({ passthrough: true }) res: Response ,
    @Param('range', new ParseEnumPipe(LogoutRange)) range: LogoutRange ,
    @GetRequesterInfo() requester : RequesterInfo,
  ) {
    await this.authService.logout(requester, range);
    this.clearRefreshCookie(res);
    return { success: true };
  }

  @Post('reset_password')
  async resetPassword(@Req() req: express.Request) {}


  // ==================================================

  @Public()
  @Post('refresh')
  async regetRefreshToken(
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response
  ) {
    // const refreshToken = authorization.replace('Bearer ', '');
    // return this.tokenService.regetAccessToken(refreshToken);

    const refresh_token = req.cookies?.['refresh_token'];
    if (!refresh_token) throw new UnauthorizedException({ errorCode: 'missing_refresh_token' });

    // new
    const { accessToken, refreshToken } = await this.tokenService.regetAccessToken(refresh_token);
    this.setAccessCookie(res, accessToken);   // <-- Thêm set cookie access token
    this.setRefreshCookie(res, refreshToken);

    return { success: true };
  }



  // ==================

  private setRefreshCookie(res: Response, refresh_token: string) {
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',   // false khi dev local (http), true khi deploy (https)
      sameSite:  'lax' , // 'strict'
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: '/auth',   // giới hạn cookie chỉ gửi kèm khi gọi đúng /auth/* — giảm rủi ro
    });
  }

  private setAccessCookie(res: Response, access_token: string) {
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_TTL_MS , // Thời gian sống của access token (ví dụ: 15 phút)
      path: '/', // Quan trọng: Dùng cho mọi request trên toàn hệ thống
    });
  }


  private clearRefreshCookie(res: Response) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' , // 'strict'
      path: '/auth',
    });
  }
}
