import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilterDbField } from '../../../_common/helper/filterQueryForRole.js';
import { GroupMember } from '../../entities/group_member.entity.js';
import { Group_Member_Role } from '../../enum/group.enum.js';

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
  }): Promise<Group_Member_Role | null> {
    const { group_id, user_id } = input;
    const member = await this.groupMemberRepo.findOne({
      where: { group: { id: group_id }, user: { id: user_id } },
      select: { role: true },
    });
    return member?.role ?? null;
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

  // ==================== Join / Rejoin — gọi từ JoinRequestService khi accept ====================

  async addMember(input: { group_id: string; user_id: string }) {
    const { group_id, user_id } = input;
    const status = await this.isMember({ group_id, user_id });

    if (status === 'is')
      throw new ConflictException({ errorCode: 'already_member' });
    if (status === 'was') return this.rejoin({ group_id, user_id });
    return this.join({ group_id, user_id });
  }

  private async join(input: { group_id: string; user_id: string }) {
    return this.groupMemberRepo.save({
      group: { id: input.group_id },
      user: { id: input.user_id },
      role: Group_Member_Role.MEMBER,
      rejoin_at: new Date(),
    });
  }

  private async rejoin(input: { group_id: string; user_id: string }) {
    const result = await this.groupMemberRepo.update(
      { group: { id: input.group_id }, user: { id: input.user_id } },
      { deleted_at: null, deleted_by: null, role: Group_Member_Role.MEMBER },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'member_record_not_found' });
    return true;
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
      order: { created_at: 'ASC' },
    });
  }

  // ==================== Promote / Demote — chỉ founder ====================

  async promoteToAdmin(input: {
    group_id: string;
    founder_id: string;
    target_user_id: string;
  }) {
    await this.assertTargetRole({
      ...input,
      requiredCallerRole: Group_Member_Role.FOUNDER,
      requiredTargetRole: Group_Member_Role.MEMBER,
    });
    return this.setRole({
      group_id: input.group_id,
      user_id: input.target_user_id,
      role: Group_Member_Role.ADMIN,
    });
  }

  async demoteToMember(input: {
    group_id: string;
    founder_id: string;
    target_user_id: string;
  }) {
    await this.assertTargetRole({
      ...input,
      requiredCallerRole: Group_Member_Role.FOUNDER,
      requiredTargetRole: Group_Member_Role.ADMIN,
    });
    return this.setRole({
      group_id: input.group_id,
      user_id: input.target_user_id,
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

  // ==================== Remove (kick) ====================

  // Admin hoặc founder kick 1 member thường
  async kickMember(input: {
    group_id: string;
    requester_id: string;
    target_user_id: string;
  }) {
    const { group_id, requester_id, target_user_id } = input;

    const requesterRole = await this.getRole({
      group_id,
      user_id: requester_id,
    });
    if (
      requesterRole !== Group_Member_Role.ADMIN &&
      requesterRole !== Group_Member_Role.FOUNDER
    ) {
      throw new ForbiddenException({ errorCode: 'not_allowed' });
    }

    await this.assertTargetRole({
      group_id,
      founder_id: requester_id,
      target_user_id,
      requiredCallerRole: requesterRole,
      requiredTargetRole: Group_Member_Role.MEMBER,
      skipCallerCheck: true,
    });

    return this.softRemove({
      group_id,
      user_id: target_user_id,
      removed_by: requester_id,
    });
  }

  // Chỉ founder được loại admin ra khỏi group hẳn (khác demote — đây là kick, không giữ lại làm member)
  async founderRemoveAdmin(input: {
    group_id: string;
    founder_id: string;
    target_user_id: string;
  }) {
    await this.assertTargetRole({
      ...input,
      requiredCallerRole: Group_Member_Role.FOUNDER,
      requiredTargetRole: Group_Member_Role.ADMIN,
    });
    return this.softRemove({
      group_id: input.group_id,
      user_id: input.target_user_id,
      removed_by: input.founder_id,
    });
  }

  private async softRemove(input: {
    group_id: string;
    user_id: string;
    removed_by: string;
  }) {
    const result = await this.groupMemberRepo.update(
      { group: { id: input.group_id }, user: { id: input.user_id } },
      { deleted_at: new Date(), deleted_by: input.removed_by },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'member_not_found' });
    return true;
  }

  // ==================== Helper dùng chung ====================

  private async assertTargetRole(input: {
    group_id: string;
    founder_id: string;
    target_user_id: string;
    requiredCallerRole: Group_Member_Role;
    requiredTargetRole: Group_Member_Role;
    skipCallerCheck?: boolean;
  }) {
    const {
      group_id,
      founder_id,
      target_user_id,
      requiredCallerRole,
      requiredTargetRole,
      skipCallerCheck,
    } = input;

    if (founder_id === target_user_id) {
      throw new ConflictException({ errorCode: 'cannot_target_yourself' });
    }

    if (!skipCallerCheck) {
      const callerRole = await this.getRole({ group_id, user_id: founder_id });
      if (callerRole !== requiredCallerRole) {
        throw new ForbiddenException({ errorCode: 'not_allowed' });
      }
    }

    const targetRole = await this.getRole({
      group_id,
      user_id: target_user_id,
    });
    if (!targetRole)
      throw new NotFoundException({ errorCode: 'target_not_member' });
    if (targetRole !== requiredTargetRole) {
      throw new ConflictException({ errorCode: 'target_role_mismatch' });
    }
  }
}
