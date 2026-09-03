import {Injectable, UnauthorizedException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {User} from '../user/entities/user.entity.js';
import {JwtService, TokenExpiredError} from '@nestjs/jwt';
import {Repository} from 'typeorm';
import {RefreshToken} from '../refresh_token/entities/refresh_token.entity.js';
import {JwtPayload} from "../_common/types/request.js";
import  bcrypt  from  "bcrypt"

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshRepo: Repository<RefreshToken>,
  ) {}



  // ============================ handle login ============================

  async login( email: string, password: string ) {
    const user = await this.userRepo.findOne({ where : { email: email } })
    if (!user ||  !user.password || !await bcrypt.compare(password, user.password)   )
      throw new UnauthorizedException({errorCode: 'invalid_credentials'});

    const token = await this.generateTokens(user)


  }



  // ============================ handle token ============================

  async generateTokens( user : User ) {

    const payload = {
      id : user.id,
      user_name : user.user_name,
      role : user.role,
    }

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    // await this.refreshRepo.save(  )

    return { accessToken, refreshToken };
  }


  async validateToken(accessToken :string) : Promise<JwtPayload>  {
      try {
        return await this.jwtService.verifyAsync(accessToken, {
          secret: process.env.JWT_ACCESS_SECRET,
        }) ;
      } catch(error) {
        if (error instanceof TokenExpiredError) throw new UnauthorizedException({errorCode : 'token_expired'});
        throw new UnauthorizedException({errorCode : 'token_invalid'});
      }
  }

  async refreshToken(refreshToken : string )  {

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
