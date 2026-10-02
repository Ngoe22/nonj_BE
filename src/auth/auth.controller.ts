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
import { GoogleAuthDto, LoginDto } from './dto/login.dto.js';
import {
  ConfirmForgetPasswordOtpDto,
  ForgetPasswordOtpDto,
} from './dto/forget_password_otp.dto.js';
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

  // ============================ Google (GIS) ============================

  /**
   * FE (GIS) lấy ID token rồi gửi lên đây.
   * Dùng CHUNG cho cả nút "Đăng nhập bằng Google" và "Đăng ký bằng Google":
   * tài khoản đã tồn tại → đăng nhập luôn, không báo lỗi trùng.
   */
  @Public()
  @Post('google')
  async googleAuth(
      @Body() body: GoogleAuthDto,
      @Res({ passthrough: true }) res: Response,
  ) {
    const { info, accessToken, refreshToken } =
        await this.authService.googleAuth(body);

    setAccessCookie(res, accessToken);
    setRefreshCookie(res, refreshToken);

    // ⚠️ Trả `info` TRỰC TIẾP, KHÁC `register`/`login` (hai cái đó trả `{ info }`).
    //
    // Nghĩa là sau khi TransformInterceptor bọc:
    //   POST /auth/google  -> user ở  res.data.data          (PHẲNG)
    //   POST /auth/login   -> user ở  res.data.data.info     (LỒNG)
    //   POST /auth/register-> user ở  res.data.data.info     (LỒNG)
    //
    // Đã từng gây bug: `useGoogleAuth` lấy `res.data` -> cache `my_profile` sai
    // shape -> `user.user_name` luôn undefined -> guard đá về /username mọi lần
    // đăng nhập Google. Sửa cho ĐỒNG NHẤT thì phải sửa cả FE cùng lúc.
    return info;
  }

  // ============================ logout ============================

  @Post('logout/:range')
  async logout(
      @Res({ passthrough: true }) res: Response,
      @Param('range', new ParseEnumPipe(LogoutRange)) range: LogoutRange,
      @GetRequesterInfo() requester: RequesterInfo,
  ) {
    await this.authService.logout(requester, range);
    clearAuthCookies(res);
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

  // ============================ quên mật khẩu (OTP) ============================

  /** Bước 1 — gửi OTP về email. Giới hạn 1 phút / lần. */
  @Public()
  @Post('forget_password_otp')
  async forgetPasswordOtp(@Body() body: ForgetPasswordOtpDto) {
    return await this.authService.forgetPasswordOtp(body);
  }

  /** Bước 2 — xác thực OTP, server đổi mật khẩu mới và gửi về email. */
  @Public()
  @Post('confirm_forget_password_otp')
  async confirmForgetPasswordOtp(@Body() body: ConfirmForgetPasswordOtpDto) {
    return await this.authService.confirmForgetPasswordOtp(body);
  }

  // ============================ đổi mật khẩu (cần đăng nhập) ============================

  /** KHÔNG @Public -> đi qua AccessTokenGuard, bắt buộc đang đăng nhập. */
  @Post('reset_password')
  async resetPassword(@GetRequesterInfo() requester: RequesterInfo) {
    return await this.authService.resetPassword(requester.id);
  }
}