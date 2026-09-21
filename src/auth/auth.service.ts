import { Injectable, NotFoundException } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';

import { TokenService } from '../refresh_token/refresh_token.service.js';
import { UserService } from '../user/user.service.js';
import { LoginDto } from './dto/login.dto.js';
import { CreateUserDto } from '../user/dto/create-user.dto.js';
import { User } from '../user/entities/user.entity.js';
import { projectBcrypt } from '../_common/helper/customBcrypt.js';
import type { RequesterInfo } from '../_common/types/request.js';
import { User_Status } from '../user/enums/user.enum.js';

@Injectable()
export class AuthService {
  constructor(
      private readonly tokenService: TokenService,
      private readonly userService: UserService,
  ) {}

  @Transactional()
  async register(body: CreateUserDto) {
    body.password = await projectBcrypt.encode(body.password);

    const info = await this.userService.creatUser(body);

    const tokens = await this.tokenService.generateTokens({
      ...this.tokenService.getPayloadFromUer(info as User),
      jti: crypto.randomUUID(),
    });

    return { info, ...tokens };
  }

  async login(loginInfo: LoginDto) {
    const user = await this.userService.getInfoForEmailLogin(loginInfo.email);

    if (
        !user ||
        !user.password ||
        !(await projectBcrypt.compare(loginInfo.password, user.password))
    )
      throw new NotFoundException({ errorCode: 'invalid_credentials' });

    if (user.status === User_Status.BANNED)
      throw new NotFoundException({ errorCode: 'banned_account' });

    const tokens = await this.tokenService.generateTokens({
      ...this.tokenService.getPayloadFromUer(user),
      jti: crypto.randomUUID(),
    });

    const { password, role, status, ...safeUser } = user;
    return { info: safeUser, ...tokens };
  }

  async logout(tokenPayload: RequesterInfo, range: 'one' | 'all') {
    const deleteTarget: { user_id: string; jti?: string } = {
      user_id: tokenPayload.id,
    };
    if (range === 'one') deleteTarget.jti = tokenPayload.jti;

    return await this.tokenService.deleteRefreshTokenFromDB(deleteTarget);
  }

  async resetPassword() {}
}