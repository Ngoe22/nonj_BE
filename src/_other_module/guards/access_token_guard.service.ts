import {CanActivate, ExecutionContext, Injectable, UnauthorizedException} from "@nestjs/common";
import {Request} from "express"
import { RefreshTokenService } from '../../refresh_token/refresh_token.service.js';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../_common/decorators/method/public.decorator.js';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: RefreshTokenService ,
    private readonly reflector: Reflector
) {}

  // @ts-ignore
  async canActivate(context: ExecutionContext): Promise<boolean> {

    // check public


    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;


    console.log(`access guard `);

    // const request = context.switchToHttp().getRequest<Request>();
    // const accessToken = this.extractTokenFromHeader(request);


      // if (!accessToken) throw new UnauthorizedException({ errorCode : 'access_token_not_found' });
      // request.user = await this.tokenService.validateToken( accessToken , "access" );

    // if (accessToken) return true;
    return true
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' ? token : undefined;
  }

}