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

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
      private readonly tokenService: TokenService,
      private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. bỏ qua route public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2. extract token
    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = this.extractTokenFromHeader(request);

    if (!accessToken)
      throw new UnauthorizedException({ errorCode: 'access_token_not_found' });

    // 3. validate + gán requester
    request.requester = await this.tokenService.validateToken(
        accessToken,
        'access',
    );

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}