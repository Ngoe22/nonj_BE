import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Public } from './_common/decorators/method/public.decorator.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Health-check: GET / — public, không yêu cầu đăng nhập */
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}


