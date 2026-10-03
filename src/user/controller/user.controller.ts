import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UserService } from '../user.service.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { SetUsernameDto } from '../dto/set-username.dto.js';
import { SetFirstPasswordDto } from '../dto/set-first-password.dto.js';
import type { RequesterInfo } from '../../_common/types/request.js';
import { Public } from '../../_common/decorators/method/public.decorator.js';
import { GetRequesterInfo } from '../../_common/decorators/param/request_payload.decorator.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ==================== Check ====================

  @Public()
  @Post('check_existing/:user_name')
  check_existing(@Param('user_name') user_name: string) {
    // Chặn ở BE nữa: client nào gọi thẳng cũng không nhận được "chưa ai dùng"
    // cho một username sai định dạng (dấu cách, ký tự đặc biệt, quá ngắn...).
    // Regex PHẢI khớp `CreateUserDto`.
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(user_name))
      throw new BadRequestException({
        errorCode: 'invalid_user_name_format',
      });

    return this.userService.checkUserNameExist(user_name);
  };

  // ==================== Public ====================

  // @Post()
  // register(@Body() body: CreateUserDto) {
  //   return this.userService.create(body);
  // }
  @Get('search/:user_name')
  findByUsername(
    @GetRequesterInfo() requester: RequesterInfo,
    @Param('user_name') user_name: string,
  ) {
    return this.userService.getOtherInfoByUserName({
      requester_id: requester.id,
      search_target_username: user_name,
    });
  }

  // @Get('user_name/:user_name')
  // findByUsername(
  //     @GetRequesterInfo() requester: RequesterInfo,
  //     @Param('user_name') user_name: string
  // ) {
  //   return this.userService.getOtherInfoByUserName({ requester_id : requester.id ,  search_target_username : user_name });
  // }

  // ==================== Current user (me) ====================

  @Get('me')
  getProfile(@GetRequesterInfo() requester: RequesterInfo) {
    // console.log(requester);
    return this.userService.getMyInfo(requester.id);
  }

  @Patch('me')
  updateProfile(
    @Body() body: UpdateUserDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.userService.updateInfo({ user_id: requester.id, body });
  }

  /** Chọn username (tài khoản Google mới chưa có) */
  @Post('username')
  setUsername(
    @Body() body: SetUsernameDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.userService.setUsername({ user_id: requester.id, body });
  }

  /** Tự đổi mật khẩu — bắt buộc mật khẩu cũ */
  @Post('change_password')
  changePassword(
    @Body() body: ChangePasswordDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.userService.changePassword({ user_id: requester.id, body });
  }

  /** Đặt mật khẩu LẦN ĐẦU — chỉ cho tài khoản Google chưa có mật khẩu */
  @Post('set_password')
  setFirstPassword(
    @Body() body: SetFirstPasswordDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.userService.setFirstPassword({ user_id: requester.id, body });
  }
}


















