import { IsIn } from 'class-validator';

export enum GroupMemberUpdateAction {
  PROMOTE = 'PROMOTE',
  DEMOTE = 'DEMOTE',
  REMOVE_ADMIN = 'REMOVE_ADMIN',
}

export class UpdateGroupMemberDto {
  @IsIn(Object.values(GroupMemberUpdateAction))
  action: GroupMemberUpdateAction;
}
