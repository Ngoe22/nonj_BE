import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { RefreshTokenService } from '../../refresh_token/refresh_token.service.js';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../_common/decorators/public.decorator.js';

@Injectable()
export class UserGuard implements CanActivate {
  constructor(

  ) {}


  async canActivate(context: ExecutionContext): Promise<boolean> {



    const request = context.switchToHttp().getRequest<Request>();

    const payload = request.user;
    const body = request.body;

    const param = request.params;



    // console.log(accessToken);
    //
    //   if (!accessToken) throw new UnauthorizedException({ errorCode : 'access_token_not_found' });
    //   request.user = await this.tokenService.validateToken( accessToken , "access" );

    // if (accessToken) return true;
    return true

  }



}
