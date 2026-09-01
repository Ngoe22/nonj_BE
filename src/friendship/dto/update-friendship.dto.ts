import { PartialType } from '@nestjs/mapped-types';
import { CreateFriendshipDto } from './create-friendship.dto.js';

export class UpdateFriendshipDto extends PartialType(CreateFriendshipDto) {}
