// import { Injectable } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { ExtractJwt, Strategy } from 'passport-jwt'; // ← lấy Strategy từ đây, không phải từ 'passport'
//
// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//   constructor() {
//
//     const secret = process.env.JWT_SECRET;
//     if (!secret) {
//       throw new Error('JWT_SECRET is not defined in environment variables');
//     }
//
//     super({
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       secretOrKey: secret, // giờ TS biết chắc đây là string
//     });
//   }
//
//   async validate(payload: { sub: string; role: string }) {
//     return { id: payload.sub, role: payload.role }; // → req.user
//   }
// }
