import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

export const UserGuard = (roles : string[]) => {

  @Injectable()
  class RoleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest<Request>();

      const reqUser = request.user;

      if (!reqUser) {
        throw new UnauthorizedException({
          error: 'access_token_not_found',
        });
      }

      return roles.includes(reqUser.role);
    }
  }

  return RoleGuard;
};
