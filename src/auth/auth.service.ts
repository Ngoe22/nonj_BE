import {Injectable, UnauthorizedException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {User} from '../user/entities/user.entity.js';
import {JwtService, TokenExpiredError} from '@nestjs/jwt';
import {Repository} from 'typeorm';
import {RefreshToken} from '../refresh_token/entities/refresh_token.entity.js';
import {JwtPayload} from "../_common/types/request.js";
import  bcrypt  from  "bcrypt"
import { RefreshTokenService } from '../refresh_token/refresh_token.service.js';
import { UserService } from '../user/user.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly tokenService: RefreshTokenService,
    private readonly userService: UserService,
  ) {}

  // ============================ handle login ============================

  async login(email: string, password: string) {
    const user = await this.userService.get({ email }  );
    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(password, user.password))
    )
      throw new UnauthorizedException({ errorCode: 'invalid_credentials' });

    if ( user.status === "BANNED" ) throw new UnauthorizedException({ errorCode: 'banned_account' });

    const token = await this.tokenService.generateTokens(user);
    const setting = await this.userService.getSetting() ;

    // return {
    //   ...this.userService.filterReturnInfo({ info : user , setting :setting  },"me") ,
    //   token
    // };
  }

  //
  // async validateUser(email: string, password: string) {
  //   const user = await this.userRepo.findOne({ where: { email } });
  //
  //   if (!user || !bcrypt.compare(password, user.password ?? '')) {
  //     throw new UnauthorizedException({
  //       errorCode: 'invalid_credentials',
  //     });
  //   }
  //   return user;
  // }
  //
  // async giveLoginToken(user: User) {
  //   const payload = { id: user.id, role: user.role };
  //   const access_token = this.jwtService.sign(payload, {}); // 15m
  //   const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });
  //
  //   // lưu refresh token xuống DB để có thể revoke sau này
  //   await this.refreshRepo.save({
  //     token_hash: stringHash(refresh_token),
  //     user: { id: user.id },
  //     expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  //   });
  //
  //   return { access_token, refresh_token };
  // }
  //
  // async refresh(oldToken: string) {
  //   const tokenHash = stringHash(oldToken);
  //   const record = await this.refreshRepo.findOne({
  //     where: { token_hash: tokenHash },
  //   });
  //
  //   if (!record) throw new UnauthorizedException('Token not found');
  //   if (record.revoked_at !== null)
  //     throw new UnauthorizedException('Token has been revoked');
  //   if (record.expires_at < new Date())
  //     throw new UnauthorizedException('Token expired');
  //
  //   const payload = this.jwtService.verify(tokenHash); // verify chữ ký JWT
  //   return this.giveLoginToken({ id: payload.sub, role: payload.role } as User);
  // }
}
