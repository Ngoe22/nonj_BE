import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {InjectDataSource, InjectRepository} from '@nestjs/typeorm';
import {DataSource, In, IsNull, Repository} from 'typeorm';
import { FilterDbField } from '../../../_common/helper/filterQueryForRole.js';
import { GroupMember } from '../../entities/group_member.entity.js';
import { Group_Member_Role } from '../../enum/group.enum.js';
import {User} from "../../../user/entities/user.entity.js";
import {Group} from "../../entities/group.entity.js";





// ===========================================================================

import { UserNotifService } from '../../../user_notif/user_notif.service.js';
import { User_Notif_Type } from '../../../user_notif/enum/user_notif.enum.js';
@Injectable()
export class GroupMemberService {
  private filterByLabels: FilterDbField<GroupMember | User | Group, string>;

  constructor(
      @InjectDataSource()
      private readonly dataSource: DataSource,
    @InjectRepository(GroupMember)
    private groupMemberRepo: Repository<GroupMember>,
    private readonly notifService: UserNotifService,
  ) {
    this.filterByLabels =  FilterDbField.create({
      labels : [ 'SA'  , 'founder' , 'admin' , 'member' ] ,
      fieldAndLabels: {
        id: [ 'SA' , 'founder', 'admin', 'member'],
        user: {
          id : ['SA','founder', 'admin', 'member'] ,
          user_name : ['SA','founder', 'admin', 'member'] ,
          nickname : ['SA','founder', 'admin', 'member'] ,
          avatar_url : ['founder', 'admin', 'member']
        },
        group: {
          id: ['SA', 'founder', 'admin', 'member'],
          slug: ['SA'],
          name: ['SA'],
        },
        role: ['SA', 'founder', 'admin','member'],
        updated_at: ['SA' ,'founder', 'admin'],
        created_at: ['SA' ,'founder', 'admin','member'],
      },
      dataBases: {
        _main : GroupMember ,
        user : User ,
        group : Group ,
      },
      dataSource : this.dataSource

    });
  }

  // ==================== Check role & membership status ====================

  async getRole(input: {
    group_id: string;
    user_id: string;
    error_msg?: string;
  }){
    const { group_id, user_id , error_msg } = input;
    const member = await this.groupMemberRepo.findOne({
      where: { group: { id: group_id }, user: { id: user_id } ,deleted_at : IsNull() },
      select: { role: true, id : true },
    });

    if (!member)
      throw new NotFoundException({ errorCode:  error_msg ?? 'not_a_member' });

    return member.role;
  }

  /** Id mọi thành viên đang hoạt động — dùng để gửi thông báo hàng loạt */
  async getMemberUserIds(group_id: string): Promise<string[]> {
    const rows = await this.groupMemberRepo.find({
      where: { group: { id: group_id }, deleted_at: IsNull() },
      relations: { user: true },
      select: { id: true, user: { id: true } },
    });

    return rows
      .map((row) => row.user?.id)
      .filter((id): id is string => !!id);
  }

  /** Founder + admin của nhóm — dùng cho thông báo cần duyệt */
  async getStaffUserIds(group_id: string): Promise<string[]> {
    const rows = await this.groupMemberRepo.find({
      where: {
        group: { id: group_id },
        role: In([Group_Member_Role.FOUNDER, Group_Member_Role.ADMIN]),
        deleted_at: IsNull(),
      },
      relations: { user: true },
      select: { id: true, user: { id: true } },
    });

    return rows
      .map((row) => row.user?.id)
      .filter((id): id is string => !!id);
  }

  async isMember(input: {
    group_id: string;
    user_id: string;
  }): Promise<'never' | 'was' | 'is'> {
    const { group_id, user_id } = input;
    const member = await this.groupMemberRepo.findOne({
      where: { group: { id: group_id }, user: { id: user_id } },
      select: { deleted_at: true , id : true },
      withDeleted: true,
    });
    if (!member) return 'never';
    if (member.deleted_at) return 'was';
    return 'is';
  }

  // ==================== Helper  ====================

  async checkActorRoleBeforeAction(input: {
    actor_id: string;
    group_id: string;
    actor_allow_roles: string[];
  }) {

    const {
      group_id,
      actor_id,
      actor_allow_roles,
    } = input;

    const actor_role = await this.getRole({
      group_id,
      user_id: actor_id,
      error_msg : 'actor_not_found_in_group',
    });

    if (!actor_allow_roles.includes(actor_role))
      throw new ForbiddenException({
        errorCode: 'actor_not_allowed_to_do_action',
      });

    return actor_role
  }

  private async checkBothSideRoleBeforeAction(input: {
    group_id: string;
    actor_id: string;
    actor_allow_roles: string[];
    target_id: string;
    target_allow_roles: string[];
  }) {
    const {
      group_id,
      actor_id,
      actor_allow_roles,
      target_id,
      target_allow_roles,
    } = input;

    const actor_role = await this.getRole({
      group_id,
      user_id: actor_id,
    });

    if (!actor_allow_roles.includes(actor_role))
      throw new NotFoundException({
        errorCode: 'actor_role_not_allowed_in_group',
      });

    const target_role = await this.getRole({
      group_id,
      user_id: target_id,
    });

    if (!target_allow_roles.includes(target_role))
      throw new NotFoundException({
        errorCode: 'target_role_not_allowed_in_group',
      });

    return { actor_role, target_role };
  }

  /**
   * Quyền thao tác của ACTOR lên member khác — khớp đúng với các check ở
   * promoteToAdmin / demoteToMember / kickMember / founderRemoveAdmin.
   */
  private getActorPermission(actor_role: Group_Member_Role) {
    const isFounder = actor_role === Group_Member_Role.FOUNDER;
    const isAdmin = actor_role === Group_Member_Role.ADMIN;

    return {
      kick_admin: isFounder, // founderRemoveAdmin: actor FOUNDER → target ADMIN
      kick_mem: isFounder || isAdmin, // kickMember: FOUNDER|ADMIN → target MEMBER
      promote_mem: isFounder, // promoteToAdmin: FOUNDER → MEMBER
      demote_admin: isFounder, // demoteToMember: FOUNDER → ADMIN
    };
  }

  /** Đọc 1 member theo đúng shape list (kèm `permission`) để trả sau mutation */
  private async viewOne(input: {
    group_id: string;
    user_id: string;
    actor_role: Group_Member_Role;
  }) {
    const { group_id, user_id, actor_role } = input;

    const label = (actor_role ?? Group_Member_Role.MEMBER).toLowerCase() as
      | 'founder'
      | 'admin'
      | 'member';

    const { select, relations } = this.filterByLabels.buildQueryObject({
      label,
    });

    const member = await this.groupMemberRepo.findOne({
      where: { group: { id: group_id }, user: { id: user_id } },
      select,
      relations,
    });

    if (!member) throw new NotFoundException({ errorCode: 'member_not_found' });

    return { ...member, permission: this.getActorPermission(actor_role) };
  }

  // ==================== Join / Rejoin —  ====================

  async addMember(input: { group_id: string; user_id: string }) {
    const { group_id, user_id } = input;
    const status = await this.isMember({ group_id, user_id });

    if (status === 'is')
      throw new ConflictException({ errorCode: 'already_member' });
    if (status === 'was') return this.rejoin({ group_id, user_id });
    return this.join({ group_id, user_id });
  }

  private async join(input: { group_id: string; user_id: string }) {
    // `await` là BẮT BUỘC: thiếu await thì lỗi save (vd unique khi join 2 lần)
    // thành unhandled rejection (Node có thể crash), và transaction duyệt
    // thành viên commit trong khi bản ghi chưa ghi xong.
    await this.groupMemberRepo.save({
      group: { id: input.group_id },
      user: { id: input.user_id },
      role: Group_Member_Role.MEMBER,
      rejoin_at: new Date(),
    });
    return "joined";
  }

  private async rejoin(input: { group_id: string; user_id: string }) {
    const result = await this.groupMemberRepo.update(
      { group: { id: input.group_id }, user: { id: input.user_id } },
      { deleted_at: null, deleted_by: null, role: Group_Member_Role.MEMBER },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'member_record_not_found' });
    return "joined";
  }

  // ==================== Get many ====================

  async getMany(input: {
    group_id: string;
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { group_id, requester_id, page, limit } = input;

    const requesterRole =  await  this.checkActorRoleBeforeAction( {
      actor_id : requester_id ,
      group_id ,
      actor_allow_roles : [ Group_Member_Role.FOUNDER , Group_Member_Role.ADMIN ]
    } )

    const { select , relations } = this.filterByLabels.buildQueryObject({
      label: requesterRole.toLowerCase(),
    });

    const rows = await this.groupMemberRepo.find({
      where: { group: { id: group_id } },
      select,
      relations ,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    // _permission là quyền của ACTOR (FE tự chọn cờ theo role của từng row)
    const permission = this.getActorPermission(requesterRole);
    return rows.map((member) => ({ ...member, permission }));
  }

  // ==================== Promote / Demote —  FOUNDER ONLY ====================

  async promoteToAdmin(input: {
    group_id: string;
    actor_id: string;
    target_id: string;
  }) {
    const { actor_role } = await this.checkBothSideRoleBeforeAction({
      ...input,
      actor_allow_roles: [Group_Member_Role.FOUNDER],
      target_allow_roles: [Group_Member_Role.MEMBER],
    });

    await this.setRole({
      group_id: input.group_id,
      user_id: input.target_id,
      role: Group_Member_Role.ADMIN,
    });

    await this.notifyMember({
      user_id: input.target_id,
      type: User_Notif_Type.GROUP_MEMBER_ROLE_CHANGED,
      group_id: input.group_id,
      role: Group_Member_Role.ADMIN,
    });

    return this.viewOne({
      group_id: input.group_id,
      user_id: input.target_id,
      actor_role,
    });
  }

  async demoteToMember(input: {
    group_id: string;
    actor_id: string;
    target_id: string;
  }) {
    const { actor_role } = await this.checkBothSideRoleBeforeAction({
      ...input,
      actor_allow_roles: [Group_Member_Role.FOUNDER],
      target_allow_roles: [Group_Member_Role.ADMIN],
    });

    await this.setRole({
      group_id: input.group_id,
      user_id: input.target_id,
      role: Group_Member_Role.MEMBER,
    });

    await this.notifyMember({
      user_id: input.target_id,
      type: User_Notif_Type.GROUP_MEMBER_ROLE_CHANGED,
      group_id: input.group_id,
      role: Group_Member_Role.MEMBER,
    });

    return this.viewOne({
      group_id: input.group_id,
      user_id: input.target_id,
      actor_role,
    });
  }

  private async setRole(input: {
    group_id: string;
    user_id: string;
    role: Group_Member_Role;
  }) {
    const result = await this.groupMemberRepo.update(
      { group: { id: input.group_id }, user: { id: input.user_id } },
      { role: input.role },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'member_not_found' });
    return true;
  }

  private async notifyMember(input: {
    user_id: string;
    type: User_Notif_Type;
    group_id: string;
    role?: Group_Member_Role;
  }) {
    try {
      const group = await this.dataSource.getRepository(Group).findOne({
        where: { id: input.group_id },
        select: { id: true, name: true },
      });

      await this.notifService.send({
        user_id: input.user_id,
        type: input.type,
        content: {
          group_id: input.group_id,
          group_name: group?.name ?? '',
          ...(input.role ? { role: input.role } : {}),
        },
      });
    } catch {
      // lỗi thông báo không được làm hỏng thao tác chính
    }
  }

  // ==================== Remove  ====================

  //selfLeft

  async kickMember(input: {
    group_id: string;
    actor_id: string;
    target_id: string;
  }) {
    const { group_id, actor_id, target_id } = input;
    const { actor_role } = await this.checkBothSideRoleBeforeAction({
      ...input,
      actor_allow_roles: [Group_Member_Role.FOUNDER, Group_Member_Role.ADMIN],
      target_allow_roles: [Group_Member_Role.MEMBER],
    });

    // đọc view TRƯỚC khi xoá (sau khi soft remove thì không find thấy nữa)
    const view = await this.viewOne({
      group_id,
      user_id: target_id,
      actor_role,
    });

    await this.softRemove({
      group_id,
      user_id: target_id,
      removed_by: actor_id,
    });

    await this.notifyMember({
      user_id: target_id,
      type: User_Notif_Type.GROUP_MEMBER_KICKED,
      group_id,
    });

    return view;
  }

  async founderRemoveAdmin(input: {
    group_id: string;
    actor_id: string;
    target_id: string;
  }) {
    const { group_id, actor_id, target_id } = input;
    const { actor_role } = await this.checkBothSideRoleBeforeAction({
      ...input,
      actor_allow_roles: [Group_Member_Role.FOUNDER],
      target_allow_roles: [Group_Member_Role.ADMIN],
    });

    const view = await this.viewOne({
      group_id,
      user_id: target_id,
      actor_role,
    });

    await this.softRemove({
      group_id,
      user_id: target_id,
      removed_by: actor_id,
    });

    return view;
  }

  async leaveGroup(input: { group_id: string; user_id: string }) {
    const { group_id, user_id } = input;

    const role = await this.getRole({ group_id, user_id });
    if (!role) throw new NotFoundException({ errorCode: 'not_a_member' });

    if (role === Group_Member_Role.FOUNDER) {
      throw new ConflictException({
        errorCode: 'founder_cannot_leave_must_transfer_ownership',
      });
    }

    const result = await this.groupMemberRepo.update(
      { group: { id: group_id }, user: { id: user_id } },
      { deleted_at: new Date(), deleted_by: user_id },
    );

    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'not_a_member' });
    return true;
  }

  private async softRemove(input: {
    group_id: string;
    user_id: string;
    removed_by: string;
  }) {
    const result = await this.groupMemberRepo.update(
      { group: { id: input.group_id }, user: { id: input.user_id } },
      {
        deleted_at: new Date(),
        deleted_by: input.removed_by,
        role: Group_Member_Role.MEMBER, // anyone got kick will be reset to member
      },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'member_not_found' });
    return true;
  }

  // ==================== Admin (SYSTEM_ADMIN) ====================

  async addFounder(input: { group_id: string; user_id: string }) {
    return this.groupMemberRepo.save({
      group: { id: input.group_id },
      user: { id: input.user_id },
      role: Group_Member_Role.FOUNDER,
    });
  }

  async adminGetMany(input: { group_id: string; page: number; limit: number }) {
    const { group_id, page, limit } = input;

    const { select ,relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    return this.groupMemberRepo.find({
      where: { group: { id: group_id } },
      relations  ,
      select ,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'ASC' },
    });
  }

  async adminSetRole(input: {
    group_id: string;
    user_id: string;
    role: Group_Member_Role;
  }) {
    const { group_id, user_id, role } = input;

    const result = await this.groupMemberRepo.update(
      { group: { id: group_id }, user: { id: user_id } },
      { role },
    );

    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'member_not_found' });
    return true;
  }

  async adminRemoveMember(input: {
    group_id: string;
    user_id: string;
    admin_id: string;
  }) {
    const { group_id, user_id, admin_id } = input;

    // soft delete
    const result = await this.groupMemberRepo.update(
      { group: { id: group_id }, user: { id: user_id } },
      { deleted_at: new Date(), deleted_by: admin_id },
    );

    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'member_not_found' });
    return true;
  }
}
