import { PartialType } from '@nestjs/mapped-types';
import { CreateFriendRequestDto } from './create-friend_request.dto.js';

export class UpdateFriendRequestDto extends PartialType(CreateFriendRequestDto) {}
