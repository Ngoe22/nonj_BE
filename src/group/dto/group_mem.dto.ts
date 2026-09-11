import { IsEnum, IsIn } from 'class-validator';
import { Group_Member_Role } from '../enum/group.enum.js';

export enum GroupMemberUpdateAction {
  PROMOTE = 'PROMOTE',
  DEMOTE = 'DEMOTE',
  REMOVE_ADMIN = 'REMOVE_ADMIN',
}

export class UpdateGroupMemberDto {
  @IsIn(Object.values(GroupMemberUpdateAction))
  action: GroupMemberUpdateAction;
}

export class AdminSetGroupMemberRoleDto {
  @IsEnum(Group_Member_Role)
  role: Group_Member_Role;
}