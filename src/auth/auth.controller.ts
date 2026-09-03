import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }

  @Post('refresh')
  async refresh(@Body('refresh_token') token: string) {
    return this.authService.refresh(token);
  }
}
