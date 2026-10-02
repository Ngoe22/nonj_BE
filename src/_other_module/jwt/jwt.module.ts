// jwt-config.module.ts (module mới, độc lập)
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      // Module này HIỆN KHÔNG được import ở đâu (chứng thực thật dùng
      // TokenService với JWT_ACCESS_SECRET/JWT_REFRESH_SECRET). Nếu sau này dùng
      // lại thì PHẢI khớp secret access, không phải biến ma JWT_SECRET.
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  exports: [JwtModule],
})
export class JwtConfigModule {}
