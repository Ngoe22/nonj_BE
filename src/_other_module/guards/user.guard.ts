import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export const UserGuard = (roles : string[]) => {

  @Injectable()
  class RoleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest<Request>();

      const reqUser = request.requester;

      if (!reqUser) {
        throw new UnauthorizedException({
          error: 'access_token_not_found',
        });
      }

      if (!roles.includes(reqUser.role))  throw new ForbiddenException({errorCode : "actor_is_not_allow"});

        return true ;
    }
  }

  return RoleGuard;
};
