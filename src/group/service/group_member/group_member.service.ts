import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { FilterDbField } from '../../../_common/helper/filterQueryForRole.js';
import { GroupMember } from '../../entities/group_member.entity.js';
import { Group_Member_Role } from '../../enum/group.enum.js';


// ===========================================================================

@Injectable()
export class GroupMemberService {
  private filterByRoles: FilterDbField<GroupMember>;

  constructor(
    @InjectRepository(GroupMember)
    private groupMemberRepo: Repository<GroupMember>,
  ) {
    this.filterByRoles = new FilterDbField({
      keyAndLabels: {
        id: ['founder', 'admin', 'member'],
        user: ['founder', 'admin', 'member'],
        group: ['founder', 'admin'],
        role: ['founder', 'admin'],
        updated_at: ['founder', 'admin'],
      },
      dataBase: GroupMember,
    });
  }

  // ==================== Check role & membership status ====================

  async getRole(input: {
    group_id: string;
    user_id: string;
    error_msg?: string;
  }): Promise<Group_Member_Role> {
    const { group_id, user_id , error_msg } = input;
    const member = await this.groupMemberRepo.findOne({
      where: { group: { id: group_id }, user: { id: user_id } ,deleted_at : IsNull() },
      select: { role: true },
    });

    if (!member)
      throw new NotFoundException({ errorCode:  error_msg ?? 'user_or_group_not_found' });

    return member.role;
  }

  async isMember(input: {
    group_id: string;
    user_id: string;
  }): Promise<'never' | 'was' | 'is'> {
    const { group_id, user_id } = input;
    const member = await this.groupMemberRepo.findOne({
      where: { group: { id: group_id }, user: { id: user_id } },
      select: { deleted_at: true },
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
      throw new UnauthorizedException({
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

    return true;
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
    const result =  this.groupMemberRepo.save({
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

    const requesterRole = await this.getRole({
      group_id,
      user_id: requester_id,
    });
    if (!requesterRole)
      throw new ForbiddenException({ errorCode: 'not_a_member' });

    const select = this.filterByRoles.buildQuerySelectObject({
      label: requesterRole.toLowerCase(),
    });

    return this.groupMemberRepo.find({
      where: { group: { id: group_id } },
      select,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  // ==================== Promote / Demote —  FOUNDER ONLY ====================

  async promoteToAdmin(input: {
    group_id: string;
    actor_id: string;
    target_id: string;
  }) {
    await this.checkBothSideRoleBeforeAction({
      ...input,
      actor_allow_roles: [Group_Member_Role.FOUNDER],
      target_allow_roles: [Group_Member_Role.MEMBER],
    });

    return this.setRole({
      group_id: input.group_id,
      user_id: input.target_id,
      role: Group_Member_Role.ADMIN,
    });
  }

  async demoteToMember(input: {
    group_id: string;
    actor_id: string;
    target_id: string;
  }) {
    await this.checkBothSideRoleBeforeAction({
      ...input,
      actor_allow_roles: [Group_Member_Role.FOUNDER],
      target_allow_roles: [Group_Member_Role.ADMIN],
    });

    return this.setRole({
      group_id: input.group_id,
      user_id: input.target_id,
      role: Group_Member_Role.MEMBER,
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

  // ==================== Remove  ====================

  //selfLeft

  async kickMember(input: {
    group_id: string;
    actor_id: string;
    target_id: string;
  }) {
    const { group_id, actor_id, target_id } = input;
    await this.checkBothSideRoleBeforeAction({
      ...input,
      actor_allow_roles: [Group_Member_Role.FOUNDER, Group_Member_Role.ADMIN],
      target_allow_roles: [Group_Member_Role.MEMBER],
    });

    return this.softRemove({
      group_id,
      user_id: target_id,
      removed_by: actor_id,
    });
  }

  async founderRemoveAdmin(input: {
    group_id: string;
    actor_id: string;
    target_id: string;
  }) {
    const { group_id, actor_id, target_id } = input;
    await this.checkBothSideRoleBeforeAction({
      ...input,
      actor_allow_roles: [Group_Member_Role.FOUNDER],
      target_allow_roles: [Group_Member_Role.ADMIN],
    });
    return this.softRemove({
      group_id,
      user_id: target_id,
      removed_by: actor_id,
    });
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

    const select = this.filterByRoles.buildQuerySelectObject({
      label: 'founder',
    });

    return this.groupMemberRepo.find({
      where: { group: { id: group_id } },
      select,
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
