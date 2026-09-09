import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const GetRequesterInfo = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const requester = ctx.switchToHttp().getRequest().requester;
    if (!requester)
      throw new UnauthorizedException({ errorCode: 'access_token_not_found' });
    return requester;
  }
);
