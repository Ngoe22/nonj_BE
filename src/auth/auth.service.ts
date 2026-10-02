import {ServiceUnavailableException,
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import { randomInt } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TokenService } from '../refresh_token/refresh_token.service.js';
import { UserService } from '../user/user.service.js';
import { GoogleAuthDto, LoginDto } from './dto/login.dto.js';
import {
  ConfirmForgetPasswordOtpDto,
  ForgetPasswordOtpDto,
} from './dto/forget_password_otp.dto.js';
import { ForgetPasswordOtp } from './entities/forget_password_otp.entity.js';
import { CreateUserDto } from '../user/dto/create-user.dto.js';
import { User } from '../user/entities/user.entity.js';
import { projectBcrypt } from '../_common/helper/customBcrypt.js';
import { mailHelper } from '../_common/helper/mail.helper.js';
import { googleHelper } from '../_common/helper/google.helper.js';
import {
  FORGET_PASSWORD_OTP_COOLDOWN_MS,
  FORGET_PASSWORD_OTP_LENGTH,
  FORGET_PASSWORD_OTP_TTL_MINUTES,
  FORGET_PASSWORD_OTP_TTL_MS,
  GENERATED_PASSWORD_LENGTH,
} from '../_common/constants/auth.constant.js';
import type { RequesterInfo } from '../_common/types/request.js';
import { User_Status } from '../user/enums/user.enum.js';

@Injectable()
export class AuthService {
  constructor(
      private readonly tokenService: TokenService,
      private readonly userService: UserService,
      @InjectRepository(ForgetPasswordOtp)
      private readonly otpRepo: Repository<ForgetPasswordOtp>,
  ) {}

  @Transactional()
  async register(body: CreateUserDto) {
    body.password = await projectBcrypt.encode(body.password);

    const info = await this.userService.creatUser(body);

    const tokens = await this.tokenService.generateTokens({
      ...this.tokenService.getPayloadFromUer(info as User),
      jti: crypto.randomUUID(),
    });

    return { info, ...tokens };
  }

  async login(loginInfo: LoginDto) {
    const user = await this.userService.getInfoForEmailLogin(loginInfo.email);

    if (
        !user ||
        !user.password ||
        !(await projectBcrypt.compare(loginInfo.password, user.password))
    )
      throw new NotFoundException({ errorCode: 'invalid_credentials' });

    if (user.status === User_Status.BANNED)
      throw new NotFoundException({ errorCode: 'banned_account' });

    const tokens = await this.tokenService.generateTokens({
      ...this.tokenService.getPayloadFromUer(user),
      jti: crypto.randomUUID(),
    });

    const { password, role, status, ...safeUser } = user;
    return { info: safeUser, ...tokens };
  }

  // ============================ Google (GIS) ============================

  /**
   * Đăng nhập / đăng ký bằng Google Identity Services.
   *
   * FE lấy ID token (credential) từ GIS rồi POST lên đây.
   * Dùng CHUNG cho cả "Đăng nhập bằng Google" và "Đăng ký bằng Google":
   * tài khoản Google đã tồn tại → đăng nhập luôn, không báo lỗi trùng.
   */
  @Transactional()
  async googleAuth(body: GoogleAuthDto) {
    const profile = await googleHelper.verifyIdToken(body.credential);

    const user = await this.userService.findOrCreateGoogleUser(profile);

    if (user.status === User_Status.BANNED)
      throw new UnauthorizedException({ errorCode: 'banned_account' });

    const tokens = await this.tokenService.generateTokens({
      ...this.tokenService.getPayloadFromUer(user),
      jti: crypto.randomUUID(),
    });

    const { id, email, user_name, nickname, avatar_url } = user;

    return {
      info: {
        id,
        email,
        user_name,
        nickname,
        bio: user.bio ?? null,
        avatar_url,
      },
      ...tokens,
    };
  }

  async logout(tokenPayload: RequesterInfo, range: 'one' | 'all') {
    const deleteTarget: { user_id: string; jti?: string } = {
      user_id: tokenPayload.id,
    };
    if (range === 'one') deleteTarget.jti = tokenPayload.jti;

    return await this.tokenService.deleteRefreshTokenFromDB(deleteTarget);
  }

  // ============================ quên mật khẩu (OTP) ============================

  /**
   * Bước 1 — user nhập email ở trang đăng nhập → gửi OTP qua email.
   *
   * - Chặn spam: 1 phút / lần. Request thứ 2 trong vòng 1 phút → 400, không gửi gì.
   * - Email không tồn tại / bị ban → vẫn trả success (không lộ email đã đăng ký).
   */
  @Transactional()
  async forgetPasswordOtp(body: ForgetPasswordOtpDto) {
    const user = await this.userService.getInfoForEmailLogin(body.email);

    if (!user || user.status === User_Status.BANNED) return { success: true };

    // KHÔNG order/so sánh bằng created_at: TypeORM ghi @CreateDateColumn bằng UTC
    // nhưng đọc lại theo local -> lệch 7h (xem ghi chú trong entity).
    // Order theo expires_at: OTP mới nhất = expires_at xa nhất (TTL cố định).
    const lastOtp = await this.otpRepo.findOne({
      where: { user: { id: user.id } },
      order: { expires_at: 'DESC' },
    });

    if (lastOtp) {
      const sentAt = lastOtp.expires_at.getTime() - FORGET_PASSWORD_OTP_TTL_MS;

      if (Date.now() - sentAt < FORGET_PASSWORD_OTP_COOLDOWN_MS)
        throw new BadRequestException({ errorCode: 'otp_send_too_soon' });
    }

    const otp = this.generateOtp();

    await this.otpRepo.save({
      user: { id: user.id },
      code: otp,
      expires_at: new Date(Date.now() + FORGET_PASSWORD_OTP_TTL_MS),
      created_by: user.id,
    });

    try {
      await mailHelper.sendForgetPasswordOtpEmail({
        to: user.email,
        otp,
        expired_minutes: FORGET_PASSWORD_OTP_TTL_MINUTES,
      });
    } catch {
      // Gửi lỗi -> 503 rõ ràng thay vì 500 "something went wrong".
      // Cả method có @Transactional nên OTP vừa lưu cũng bị rollback.
      throw new ServiceUnavailableException({ errorCode: 'email_send_failed' });
    }

    return { success: true };
  }

  // ============================ xác thực OTP ============================

  /**
   * Bước 2 — user nhập OTP.
   *
   * OTP khớp + còn hạn → đánh dấu `is_pass_otp = true`, sinh MẬT KHẨU MỚI, đổi luôn
   * cho user rồi gửi mật khẩu mới qua email + thu hồi mọi phiên đăng nhập cũ.
   */
  @Transactional()
  async confirmForgetPasswordOtp(body: ConfirmForgetPasswordOtpDto) {
    const user = await this.userService.getInfoForEmailLogin(body.email);

    if (!user)
      throw new BadRequestException({ errorCode: 'otp_invalid_or_expired' });

    const record = await this.otpRepo.findOne({
      where: { user: { id: user.id }, code: body.otp, is_pass_otp: false },
      order: { expires_at: 'DESC' },
    });

    if (!record || record.expires_at.getTime() < Date.now())
      throw new BadRequestException({ errorCode: 'otp_invalid_or_expired' });

    record.is_pass_otp = true;
    await this.otpRepo.save(record);

    const newPassword = this.generatePassword();
    await this.userService.setPassword({
      user_id: user.id,
      password_hash: await projectBcrypt.encode(newPassword),
    });

    await this.tokenService.deleteRefreshTokenFromDB({ user_id: user.id });

    try {
      await mailHelper.sendNewPasswordEmail({
        to: user.email,
        password: newPassword,
      });
    } catch {
      // Mail lỗi -> ném ra để @Transactional ROLLBACK: mật khẩu cũ giữ nguyên,
      // người dùng KHÔNG bị khoá trái tài khoản.
      throw new ServiceUnavailableException({ errorCode: 'email_send_failed' });
    }

    return { success: true };
  }

  // ============================ đổi mật khẩu (đã đăng nhập) ============================

  /**
   * User đang đăng nhập bấm "đổi mật khẩu":
   *  - xoá hết token (refresh token của mọi thiết bị + OTP cũ)
   *  - sinh mật khẩu mới, đổi cho user
   *  - gửi mật khẩu mới qua email
   */
  @Transactional()
  async resetPassword(user_id: string) {
    const user = await this.userService.getAuthInfoById(user_id);
    if (!user) throw new NotFoundException({ errorCode: 'user_not_found' });

    await this.tokenService.deleteRefreshTokenFromDB({ user_id });
    await this.otpRepo.delete({ user: { id: user_id } });

    const newPassword = this.generatePassword();
    await this.userService.setPassword({
      user_id,
      password_hash: await projectBcrypt.encode(newPassword),
    });

    try {
      await mailHelper.sendNewPasswordEmail({
        to: user.email,
        password: newPassword,
      });
    } catch {
      // Như trên: rollback để không đổi mật khẩu khi chưa gửi được mail.
      throw new ServiceUnavailableException({ errorCode: 'email_send_failed' });
    }

    return { success: true };
  }

  // ============================ helpers ============================

  /** OTP 6 số, giữ số 0 ở đầu (vd: 007123) */
  private generateOtp() {
    return randomInt(0, 10 ** FORGET_PASSWORD_OTP_LENGTH)
      .toString()
      .padStart(FORGET_PASSWORD_OTP_LENGTH, '0');
  }

  /** Mật khẩu ngẫu nhiên — bỏ ký tự dễ nhầm khi copy: 0 O 1 l I */
  private generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from(
      { length: GENERATED_PASSWORD_LENGTH },
      () => chars[randomInt(0, chars.length)],
    ).join('');
  }
}