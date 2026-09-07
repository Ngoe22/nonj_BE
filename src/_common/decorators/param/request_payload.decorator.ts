import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const RequestPayload = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const payload = ctx.switchToHttp().getRequest().payload;
    if (!payload) throw new UnauthorizedException( { errorCode : "access_token_not_found" } );
    return payload;
  }
);
