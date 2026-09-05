import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { RefreshTokenService } from '../../refresh_token/refresh_token.service.js';

@Injectable()
export class RefreshTokenGuardService implements CanActivate {
  constructor(private readonly tokenService: RefreshTokenService) {}

  // @ts-ignore
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const refreshToken = this.extractRefreshTokenFromCookie(request);

    // console.log(refreshToken);
    //
    //   if (!refreshToken) throw new UnauthorizedException({ errorCode : 'refresh_token_not_found' });
    //   const payload = await this.tokenService.validateToken(refreshToken , "refresh");
    //   request.user = {
    //     id: payload.id,
    //     user_name: payload.user_name,
    //     role: payload.role,
    //   };

    if (refreshToken) return true;
  }

  private extractRefreshTokenFromCookie(request: Request): string | undefined {
    return request.cookies?.refresh_token;
  }
}
