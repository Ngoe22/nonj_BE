import {Body, Injectable, NotFoundException, Post, Req, UnauthorizedException} from '@nestjs/common';
import { TokenService} from '../refresh_token/refresh_token.service.js';
import { UserService } from '../user/user.service.js';
import { LoginDto } from './dto/login.dto.js';
import express from 'express';
import { projectBcrypt } from '../_common/helper/customBcrypt.js';
import type { RequesterInfo } from '../_common/types/request.js';
import { CreateUserDto } from '../user/dto/create-user.dto.js';
import {User} from "../user/entities/user.entity.js";
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class AuthService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
  ) {}

  // ============================ handle login ============================



  @Transactional()
  async register (body : CreateUserDto)  {

    body.password = await projectBcrypt.encode(body.password )

    const info = await this.userService.creatUser(body);

    const payload = {
      ...this.tokenService.getPayloadFromUer(info as User),
      jti: crypto.randomUUID(),
    };

    const token = await this.tokenService.generateTokens(payload);
    return { info,  ...token };
  }



  async login(loginInfo: LoginDto) {
    const user = await this.userService.getInfoForEmailLogin(loginInfo.email);

    if (
      !user ||
      !user.password ||
      !(await projectBcrypt.compare(loginInfo.password, user.password))
    )
      throw new NotFoundException({ errorCode: 'invalid_credentials' });

    if (user.status === 'BANNED')
      throw new NotFoundException({ errorCode: 'banned_account' });

    const token = await this.tokenService.generateTokens({
      ...this.tokenService.getPayloadFromUer(user),
      jti: crypto.randomUUID(),
    }); // return access + refresh

    const { password, ...safeUser } = user;
    return { info: safeUser,  ...token };
  }


  async logout(tokenPayload :RequesterInfo , range: 'one' | 'all') {
    const deleteTarget = {
      user_id: tokenPayload.id,
      jti: '',
    };
    if (range === 'one') deleteTarget.jti = tokenPayload.jti;

    return await this.tokenService.deleteRefreshTokenFromDB(deleteTarget);
  }


  async resetPassword() {}











  //




}



