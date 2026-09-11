import * as string_decoder from 'node:string_decoder';
import { IsEnum, IsUUID } from 'class-validator';
import { Group_Join_Request_Status_UPDATE } from '../enum/group_join_request.enum.js';

export class CreateGroupJoinRequest {
  @IsUUID()
  group: string;
}

export class UpdateGroupJoinRequest {
  @IsEnum(Group_Join_Request_Status_UPDATE)
  status: Group_Join_Request_Status_UPDATE;
}