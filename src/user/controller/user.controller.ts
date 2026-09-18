import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserService } from '../user.service.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { UpdateUserSettingDto } from '../dto/update-setting.dto.js';
import type { RequesterInfo } from '../../_common/types/request.js';
import { Public } from '../../_common/decorators/method/public.decorator.js';
import { GetRequesterInfo } from '../../_common/decorators/param/request_payload.decorator.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ==================== Public ====================

  // @Post()
  // register(@Body() body: CreateUserDto) {
  //   return this.userService.create(body);
  // }



  @Get('user_name/:user_name')
  findByUsername(
      @GetRequesterInfo() requester: RequesterInfo,
      @Param('user_name') user_name: string
  ) {
    return this.userService.getOtherInfoByUserName({ requester_id : requester.id ,  search_target_username : user_name });
  }

  // ==================== Current user (me) ====================

  @Get('me')
  getProfile(@GetRequesterInfo() requester: RequesterInfo) {
    // console.log(requester);
    return this.userService.getMyInfo(requester.id );
  }

  @Patch('me')
  updateProfile(
    @Body() body: UpdateUserDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.userService.updateInfo({ user_id: requester.id , body });
  }


  //======================================



  @Get('me/setting')
  getMySetting(@GetRequesterInfo() requester: RequesterInfo) {
    return this.userService.getSetting(requester.id, 'me');
  }

  @Patch('me/setting')
  updateMySetting(
    @Body() body: UpdateUserSettingDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.userService.updateSetting(requester.id, body);
  }
}


















