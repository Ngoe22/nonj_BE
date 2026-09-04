import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateRefreshTokenDto } from './dto/create-refresh_token.dto.js';
import { UpdateRefreshTokenDto } from './dto/update-refresh_token.dto.js';
import { User } from '../user/entities/user.entity.js';
import { JwtPayload } from '../_common/types/request.js';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';

@Injectable()
export class RefreshTokenService {
  constructor(private readonly jwtService: JwtService) {}

  // ============================ handle token ============================

  async generateTokens(user: User) {
    const payload = {
      id: user.id,
      user_name: user.user_name,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    // await this.refreshRepo.save(  )

    return { accessToken, refreshToken };
  }

  async validateAccessToken(accessToken: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync(accessToken, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch (error) {
      const errorCode =
        error instanceof TokenExpiredError ? 'token_expired' : 'token_invalid';
      throw new UnauthorizedException({ errorCode });
    }
  }

  async tokenRefresh(refreshToken: string) {}
}
