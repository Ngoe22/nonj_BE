import {CanActivate, ExecutionContext, Injectable, UnauthorizedException} from "@nestjs/common";
import {Request} from "express"
import {AuthService} from "../../auth/auth.service.js";
import { RefreshTokenService } from '../../refresh_token/refresh_token.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly authService: AuthService ,
        private readonly tokenService : RefreshTokenService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const accessToken = this.extractTokenFromHeader(request);

        if (!accessToken) throw new UnauthorizedException({ errorCode : 'token_not_found' });
        request.user = await this.tokenService.validateAccessToken(accessToken);
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}