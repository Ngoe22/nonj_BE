import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from '../../refresh_token/refresh_token.service.js';
import { REFRESH_COOKIE_NAME } from '../../_common/constants/auth.constant.js';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken)
      throw new UnauthorizedException({ errorCode: 'refresh_token_not_found' });

    request.requester = await this.tokenService.validateToken(
        refreshToken,
        'refresh',
    );
    return true;
  }
}