import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import express from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  //
  @Post('login')
  async login(@Body() body: LoginDto) {
    return await this.authService.login(body);
  }

  @Post('logout/:range')
  async logout(
    @Req() req: express.Request,
    @Param('range') range: 'one' | 'all',
  ) {

    if (!req.user)
      throw new NotFoundException({ errorCode: 'access_token_not_found'});

    return this.authService.logout(req.user, range);
  }

  @Post('reset_password')
  async resetPassword(@Req() req: express.Request) {}

}
