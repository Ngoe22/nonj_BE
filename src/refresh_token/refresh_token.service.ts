import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '../user/entities/user.entity.js';
import { JwtPayload } from '../_common/types/request.js';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { RefreshToken } from './entities/refresh_token.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { projectBcrypt } from '../_common/helper/customBcrypt.js';
import { Transactional } from 'typeorm-transactional';
import { UUID } from 'node:crypto';




@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepository: Repository<RefreshToken>,
  ) {}

  // ============================ handle token ============================

  // for login | thanh cong truyen user vao
  @Transactional()
  async generateTokens(user: User) {
    const jti = crypto.randomUUID();
    const payload = {
      id: user.id,
      user_name: user.user_name,
      role: user.role,
    };

    const accessToken = await this.generateToken(payload, 'access');
    const refreshToken = await this.generateToken(
      { jti, ...payload },
      'refresh',
    );

    await this.saveRefreshTokenToDB({ refreshToken, user_id: user.id, jti: jti });
    return { accessToken, refreshToken };
  }

  async generateToken(payload: JwtPayload, tokenType: 'access' | 'refresh') {
    const [secret, expiresIn]: [string | undefined, '15m' | '7d'] =
      tokenType === 'access'
        ? [process.env.JWT_ACCESS_SECRET, '15m']
        : [process.env.JWT_REFRESH_SECRET, '7d'];
    if (!secret) throw new Error(`Missing JWT secret for ${tokenType} token`);
    return await this.jwtService.signAsync(payload, { secret, expiresIn });
  }

  async validateToken(
    token: string,
    type: 'access' | 'refresh',
  ): Promise<JwtPayload> {
    const secret =
      type === 'access'
        ? process.env.JWT_ACCESS_SECRET
        : process.env.JWT_REFRESH_SECRET;
    try {
      return await this.jwtService.verifyAsync(token, { secret });
    } catch (error) {
      const errorCode =
        error instanceof TokenExpiredError
          ? `${type}_token_expired`
          : `${type}_token_invalid`;
      throw new UnauthorizedException({ errorCode });
    }
  }

  @Transactional()
  async regetAccessToken(refreshToken: string) {
    const oldPayload = await this.validateToken(refreshToken, 'refresh');

    await this.checkTokenInDB({
      user_id: oldPayload.id,
      jti: oldPayload.jti ,
      refreshToken,

    });

    // delete old refresh
    await this.refreshRepository.delete({
      jti: oldPayload.jti,
      user: { id: oldPayload.id },
    });

    const newPayload = {
      id: oldPayload.id,
      user_name: oldPayload.user_name,
      role: oldPayload.role,
    };

    const newJti = crypto.randomUUID();
    const newAccessToken = await this.generateToken(newPayload, 'access');
    const newRefreshToken = await this.generateToken(
      { jti: newJti, ...newPayload },
      'refresh',
    );

    // save new refresh
    await this.saveRefreshTokenToDB({
      refreshToken,
      user_id: newPayload.id,
      jti: newJti,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  // ==== to DB ===========================

  private async saveRefreshTokenToDB(data: {
    refreshToken: string;
    user_id: string;
    jti: UUID;
  }) {
    const { user_id, jti, refreshToken } = data;
    return await this.refreshRepository.save({
      jti,
      user: { id: user_id },
      token_hash: await projectBcrypt.encode(refreshToken),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  private async checkTokenInDB(data: {
    jti: UUID;
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
}
