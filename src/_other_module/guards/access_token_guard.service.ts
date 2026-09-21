import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { TokenService } from '../../refresh_token/refresh_token.service.js';
import { IS_PUBLIC_KEY } from '../../_common/decorators/method/public.decorator.js';
import { ACCESS_COOKIE_NAME } from '../../_common/constants/auth.constant.js';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
      private readonly tokenService: TokenService,
      private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = this.extractAccessToken(request);

    if (!accessToken)
      throw new UnauthorizedException({ errorCode: 'access_token_not_found' });

    request.requester = await this.tokenService.validateToken(
        accessToken,
        'access',
    );

    return true;
  }

  /** Đọc từ cookie (ưu tiên), fallback header Bearer cho API client */
  private extractAccessToken(request: Request): string | undefined {
    const fromCookie = request.cookies?.[ACCESS_COOKIE_NAME];
    if (fromCookie) return fromCookie;

    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}