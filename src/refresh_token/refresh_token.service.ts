import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

import { User } from '../user/entities/user.entity.js';
import type { RequesterInfo } from '../_common/types/request.js';
import { RefreshToken } from './entities/refresh_token.entity.js';
import { projectBcrypt } from '../_common/helper/customBcrypt.js';
import {
  ACCESS_TOKEN_TTL_JWT,
  REFRESH_TOKEN_TTL_JWT,
  REFRESH_TOKEN_TTL_MS,
} from '../_common/constants/auth.constant.js';

const ROTATE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24h

@Injectable()
export class TokenService {
  constructor(
      private readonly jwtService: JwtService,
      @InjectRepository(RefreshToken)
      private readonly refreshRepository: Repository<RefreshToken>,
  ) {}

  // ============================ validate ============================

  async validateToken(
      token: string,
      type: 'access' | 'refresh',
  ): Promise<RequesterInfo> {
    const secret =
        type === 'access'
            ? process.env.JWT_ACCESS_SECRET
            : process.env.JWT_REFRESH_SECRET;

    try {
      const { iat, exp, ...output } = await this.jwtService.verifyAsync(token, {
        secret,
      });
      return output;
    } catch (error) {
      const errorCode =
          error instanceof TokenExpiredError
              ? `${type}_token_expired`
              : `${type}_token_invalid`;
      throw new UnauthorizedException({ errorCode });
    }
  }

  // ============================ generate ============================

  @Transactional()
  async generateTokens(payload: RequesterInfo) {
    const accessToken = await this.generateToken(payload, 'access');
    const refreshToken = await this.generateToken(payload, 'refresh');

    await this.saveRefreshTokenToDB({
      refreshToken,
      user_id: payload.id,
      jti: payload.jti,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Refresh flow:
   *  - Nếu refresh token còn > 24h → cấp access mới, giữ nguyên refresh (jti giữ nguyên)
   *  - Nếu còn ≤ 24h → rotate: xoá cũ, tạo mới, LƯU MỚI vào DB
   *  - jti dùng chung giữa access & refresh trong cùng phiên
   */
  @Transactional()
  async regetAccessToken(oldRefreshToken: string) {
    const oldPayload = await this.validateToken(oldRefreshToken, 'refresh');

    const stored = await this.checkTokenInDB({
      user_id: oldPayload.id,
      jti: oldPayload.jti,
      refreshToken: oldRefreshToken,
    });

    const now = Date.now();
    const expiresAt = new Date(stored.expires_at).getTime();

    let newRefreshToken = oldRefreshToken;
    let currentJti = oldPayload.jti;

    if (expiresAt - now < ROTATE_THRESHOLD_MS) {
      await this.deleteRefreshTokenFromDB({
        jti: oldPayload.jti,
        user_id: oldPayload.id,
      });

      currentJti = crypto.randomUUID();

      newRefreshToken = await this.generateToken(
          { ...oldPayload, jti: currentJti },
          'refresh',
      );

      await this.saveRefreshTokenToDB({
        refreshToken: newRefreshToken,
        user_id: oldPayload.id,
        jti: currentJti,
      });
    }

    const newAccessToken = await this.generateToken(
        { ...oldPayload, jti: currentJti },
        'access',
    );

    return { newAccessToken, newRefreshToken };
  }

  // ============================ helpers ============================

  getPayloadFromUer(user: User) {
    return {
      id: user.id,
      user_name: user.user_name,
      role: user.role,
    };
  }

  async generateToken(
      payload: RequesterInfo,
      tokenType: 'access' | 'refresh',
  ) {
    const secret =
        tokenType === 'access'
            ? process.env.JWT_ACCESS_SECRET
            : process.env.JWT_REFRESH_SECRET;
    const expiresIn =
        tokenType === 'access' ? ACCESS_TOKEN_TTL_JWT : REFRESH_TOKEN_TTL_JWT;

    if (!secret) throw new Error(`Missing JWT secret for ${tokenType} token`);

    return this.jwtService.signAsync(payload, { secret, expiresIn });
  }

  // ============================ DB ============================

  private async checkTokenInDB(data: {
    jti: string;
    user_id: string;
    refreshToken: string;
  }): Promise<RefreshToken> {
    const { user_id, jti, refreshToken } = data;

    const stored = await this.refreshRepository.findOne({
      where: { jti, user: { id: user_id } },
    });

    if (!stored)
      throw new UnauthorizedException({ errorCode: 'refresh_token_not_found' });

    if (stored.revoked_at || stored.expires_at < new Date())
      throw new UnauthorizedException({ errorCode: 'refresh_token_expired' });

    const isMatch = await projectBcrypt.compare(
        refreshToken,
        stored.token_hash,
    );
    if (!isMatch)
      throw new UnauthorizedException({ errorCode: 'refresh_token_not_found' });

    return stored;
  }

  async saveRefreshTokenToDB(data: {
    refreshToken: string;
    user_id: string;
    jti: string;
  }) {
    const { user_id, jti, refreshToken } = data;
    return await this.refreshRepository.save({
      jti,
      user: { id: user_id },
      token_hash: await projectBcrypt.encode(refreshToken),
      expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
  }

  async deleteRefreshTokenFromDB(input: { user_id: string; jti?: string }) {
    const where: FindOptionsWhere<RefreshToken> = {
      user: { id: input.user_id },
    };
    if (input.jti !== undefined) where.jti = input.jti;

    await this.refreshRepository.delete(where);
    return true;
  }
}