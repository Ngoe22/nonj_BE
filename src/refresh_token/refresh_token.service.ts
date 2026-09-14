import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '../user/entities/user.entity.js';
import type { RequesterInfo } from '../_common/types/request.js';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { RefreshToken } from './entities/refresh_token.entity.js';
import { FindOptionsWhere, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { projectBcrypt } from '../_common/helper/customBcrypt.js';
import { Transactional } from 'typeorm-transactional';
import { UUID } from 'node:crypto';
import {ACCESS_TOKEN_TTL_JWT, REFRESH_TOKEN_TTL_JWT, REFRESH_TOKEN_TTL_MS} from "../_common/constants/auth.constant.js";


// =====================================================================================




@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepository: Repository<RefreshToken>,
  ) {}

  // ============================ handle token ============================

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
      return output; // return payload = user info
    } catch (error) {
      const errorCode =
        error instanceof TokenExpiredError
          ? `${type}_token_expired`
          : `${type}_token_invalid`;
      throw new UnauthorizedException({ errorCode });
    }
  }

  //
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



  @Transactional()
  async regetAccessToken(oldRefreshToken: string) {
    const oldPayload = await this.validateToken(oldRefreshToken, 'refresh');

    await this.checkTokenInDB({
      user_id: oldPayload.id,
      jti: oldPayload.jti,
      refreshToken: oldRefreshToken,
    });

    // delete old refresh
    await this.deleteRefreshTokenFromDB({
      jti: oldPayload.jti,
      user_id: oldPayload.id,
    });

    oldPayload.jti = crypto.randomUUID(); // update old payload
    const { accessToken, refreshToken } = await this.generateTokens(oldPayload);
    // saved new refresh generateTokens

    return { accessToken, refreshToken };
  }



  // ==== to  ===========================



  getPayloadFromUer(user: User) {
    return {
      id: user.id,
      user_name: user.user_name,
      role: user.role   ,
    };
  }

  private async checkTokenInDB(data: {
    jti: string;
    user_id: string;
    refreshToken: string;
  }) {
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

    return true;
  }



  private async generateToken(
      payload: RequesterInfo,
      tokenType: 'access' | 'refresh',
  ) {
    const secret = tokenType === 'access' ? process.env.JWT_ACCESS_SECRET : process.env.JWT_REFRESH_SECRET;
    const expiresIn = tokenType === 'access' ? ACCESS_TOKEN_TTL_JWT : REFRESH_TOKEN_TTL_JWT;

    if (!secret) throw new Error(`Missing JWT secret for ${tokenType} token`);

    return this.jwtService.signAsync(payload, { secret, expiresIn });
  }

  // ==== to DB ===========================

  private async saveRefreshTokenToDB(data: {
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
    if (input.jti) where.jti = input.jti;
     await this.refreshRepository.delete(where);
     return true
  }
}
