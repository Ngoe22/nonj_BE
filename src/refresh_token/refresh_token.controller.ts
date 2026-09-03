import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RefreshTokenService } from './refresh_token.service.js';
import { CreateRefreshTokenDto } from './dto/create-refresh_token.dto.js';
import { UpdateRefreshTokenDto } from './dto/update-refresh_token.dto.js';

@Controller('refresh-token')
export class RefreshTokenController {
  constructor(private readonly refreshTokenService: RefreshTokenService) {}


}
