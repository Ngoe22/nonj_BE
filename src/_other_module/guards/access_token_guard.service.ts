import {CanActivate, ExecutionContext, Injectable, UnauthorizedException} from "@nestjs/common";
import {Request} from "express"
import { RefreshTokenService } from '../../refresh_token/refresh_token.service.js';

@Injectable()
export class AccessTokenGuardService implements CanActivate {
  constructor(private readonly tokenService: RefreshTokenService) {}

  // @ts-ignore
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = this.extractTokenFromHeader(request);

    // console.log(accessToken);
    //
    //   if (!accessToken) throw new UnauthorizedException({ errorCode : 'access_token_not_found' });
    //   const payload = await this.tokenService.validateToken(accessToken , "access");
    //   request.user = {
    //     id: payload.id,
    //     user_name: payload.user_name,
    //     role: payload.role,
    //   };

    if (accessToken) return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' ? token : undefined;
  }

  private extractRefreshTokenFromCookie(request: Request): string | undefined {
    return request.cookies?.refresh_token;
  }
}