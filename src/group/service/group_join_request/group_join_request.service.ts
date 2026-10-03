import {BadRequestException, ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {FilterDbField} from '../../../_common/helper/filterQueryForRole.js';
import {GroupJoinRequest} from '../../entities/group_join_request.entity.js';
import {InjectDataSource, InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import {Group_Join_Mode, Group_Join_Request_Status, Group_Member_Role} from '../../enum/group.enum.js';
import {GroupService} from "../group/group.service.js";
import {GroupMemberService} from "../group_member/group_member.service.js";
import {Transactional} from "typeorm-transactional";
import {Group_Join_Request_Status_UPDATE} from "../../enum/group_join_request.enum.js";
import {User} from "../../../user/entities/user.entity.js";
import {Group} from "../../entities/group.entity.js";


//======================================


import { UserNotifService } from '../../../user_notif/user_notif.service.js';
import { AdminGroupJoinRequestQueryDto } from '../../dto/admin-group-join-request-query.dto.js';
import {
  adminCreatedRange,
  adminLike,
  adminPage,
  adminUuidLike,
  adminWhere,
  markDeleted,
} from '../../../_common/helper/admin_query.helper.js';
import { User_Notif_Type } from '../../../user_notif/enum/user_notif.enum.js';
@Injectable()
export class GroupJoinRequestService {
  private filterByLabels: FilterDbField<GroupJoinRequest | User | Group, string>;

  constructor(
      @InjectDataSource()
      private readonly dataSource: DataSource,
    @InjectRepository(GroupJoinRequest)
    private groupJoinRequestRepo: Repository<GroupJoinRequest>,
    //
    private readonly groupMemberService: GroupMemberService,
    private readonly groupService: GroupService,
    private readonly notifService: UserNotifService,
  ) {
    this.filterByLabels = FilterDbField.create({
      labels: ['SA', 'founder', 'admin', 'pending'],
      fieldAndLabels: {
        id: ['SA', 'founder', 'admin', 'pending'],
        sender: {
          id: ['SA', 'founder', 'admin', 'pending'],
          user_name: ['SA', 'founder', 'admin'],
          nickname: ['SA', 'founder', 'admin'],
          avatar_url: ['founder', 'admin'],
        },
        group: {
          id: ['SA', 'pending', 'founder', 'admin'],
          slug: ['SA', 'pending'],
          name: ['SA', 'pending'],
        },
        status: ['SA', 'founder', 'admin', 'pending'],
        reviewer: ['SA'],
        reviewed_at: ['SA'],
        created_at: ['SA', 'founder', 'admin', 'pending'],
        updated_at: ['SA'],
        deleted_at: ['SA'],
      },
      dataBases: {
        _main: GroupJoinRequest,
        sender: User,
        group: Group,
      },
      dataSource: this.dataSource,
      FE_permission: {
        approve: ['founder', 'admin'],
        reject: ['founder', 'admin'],
      },
    });
  }

  // ============ Helper ============

   private async blockExistedMemRequest( input :  { group_id :string , user_id : string } ) {
      const { group_id , user_id } = input;
      const isMem = await  this.groupMemberService.isMember({
         group_id , user_id
       })
       if ( isMem === 'is' ) throw new ConflictException({ errorCode : 'already_in_group' });
       return isMem
    }


  // ============ Get Many ============

  async getManyForGroup(input: {
    group_id: string;
    requester_id: string;
    limit: number;
    page: number;
  }) {
    const { group_id, requester_id, limit, page } = input;


    const actor_role =  await this.groupMemberService.checkActorRoleBeforeAction({
      actor_id: requester_id,
      group_id,
      actor_allow_roles: [Group_Member_Role.FOUNDER, Group_Member_Role.ADMIN],
    });

    const role = actor_role.toLowerCase()
    const { select , relations } = this.filterByLabels.buildQueryObject({ label: role });

    const result =  await this.groupJoinRequestRepo.find({
      where: { group: { id: group_id  }  , status : Group_Join_Request_Status.PENDING},
      relations  ,
      select ,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    const permission = this.filterByLabels.getLabelPermission(role);


    return result.map((item) => ({
      ...item,
      permission, // ⬅️ thêm vào mỗi item
    }));
  }

  async getManyForUser(input: {
    user_id: string;
    limit: number;
    page: number;
  }) {
    const { user_id, limit, page } = input;

    const { select , relations } = this.filterByLabels.buildQueryObject({ label: 'pending' });

    return await this.groupJoinRequestRepo.find({
      where: { sender: { id: user_id } },
      relations  ,
      select ,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  // ============ Create ============

  async create(input : {
    requester_id: string;
    group_id: string
  }) {

    const { group_id , requester_id } = input;
    const setting =  await this.groupService.getSetting(group_id)
    const join_mode = setting.join_mode

    switch (join_mode) {
      case Group_Join_Mode.PUBLIC : {
        return this.groupMemberService.addMember( {
          group_id , user_id : requester_id
        } )
      }
      case Group_Join_Mode.BY_REQUEST  :{

        const isPending = await this.groupJoinRequestRepo.findOne({
          where: {
            group: { id: group_id },
            sender: { id: requester_id },
            status: Group_Join_Request_Status.PENDING,
          },
        });
        if (isPending) return 'pending';

        await this.blockExistedMemRequest( { group_id , user_id:requester_id } )
        const saved = await this.groupJoinRequestRepo.save({
          sender: { id : requester_id } ,
          group : { id : group_id },
          created_by : requester_id,
        });

        // báo cho founder + admin của nhóm để họ vào duyệt
        await this.notifyStaff({
          group_id,
          requester_id,
          join_request_id: saved.id,
        });

        return 'pending';
      }
      default: {
        throw new BadRequestException( {errorCode : 'invalid_request'} );
      }
    }

  }

  // ============ Update ============


  @Transactional()
  async update(input: {
    body: any;
    user_id: string;
    group_id :string;
    group_admin_id: string;
    join_request_id: string;
  }) {
    const { body, user_id, group_admin_id, join_request_id ,group_id } = input;

     const actor_role = await this.groupMemberService.checkActorRoleBeforeAction({
      actor_id: group_admin_id,
      group_id,
      actor_allow_roles: [Group_Member_Role.FOUNDER, Group_Member_Role.ADMIN],
     });

     // if approved add member
     if ( body.status === Group_Join_Request_Status_UPDATE.APPROVED ) {
       await this.groupMemberService.addMember( {
         group_id , user_id
       } )

     }

    const updateReq = await this.groupJoinRequestRepo.update(
      {
        id: join_request_id,
        sender: { id: user_id },
        status: Group_Join_Request_Status.PENDING,
      },
      {
        ...body,
        reviewer: { id: group_admin_id },
        reviewed_at: new Date(),
        deleted_at: new Date(), // for cronjob
      },
    );
    if (updateReq.affected === 0)
      throw new NotFoundException({
        errorCode: 'user_or_join_group_request_not_found',
      });

    const approved =
      body.status === Group_Join_Request_Status_UPDATE.APPROVED;

    await this.notifService
      .send({
        user_id,
        type: approved
          ? User_Notif_Type.GROUP_JOIN_APPROVED
          : User_Notif_Type.GROUP_JOIN_REJECTED,
        content: {
          group_id,
          group_name: await this.getGroupName(group_id),
        },
      })
      .catch(() => undefined);

    return { success: true };

    // const label = actor_role.toLowerCase();
    // const { select, relations } = this.filterByLabels.buildQueryObject({
    //   label,
    // });
    // const updated = await this.groupJoinRequestRepo.findOne({
    //   where: { id: join_request_id },
    //   select,
    //   relations,
    // });
    // if (!updated)
    //   throw new NotFoundException({
    //     errorCode: 'user_or_join_group_request_not_found',
    //   });
    //
    // return {
    //   ...updated,
    //   permission: this.filterByLabels.getLabelPermission(label),
    // };
  }

  // ============ Notify helpers ============

  private async getGroupName(group_id: string): Promise<string> {
    const group = await this.dataSource.getRepository(Group).findOne({
      where: { id: group_id },
      select: { id: true, name: true },
    });
    return group?.name ?? '';
  }

  private async notifyStaff(input: {
    group_id: string;
    requester_id: string;
    join_request_id: string;
  }) {
    try {
      const staffIds = await this.groupMemberService.getStaffUserIds(
        input.group_id,
      );
      if (staffIds.length === 0) return;

      const requester = await this.dataSource.getRepository(User).findOne({
        where: { id: input.requester_id },
        select: {
          id: true,
          user_name: true,
          nickname: true,
          avatar_url: true,
        },
      });

      await this.notifService.sendMany({
        user_ids: staffIds,
        exclude_user_id: input.requester_id,
        type: User_Notif_Type.GROUP_JOIN_REQUEST,
        content: {
          group_id: input.group_id,
          group_name: await this.getGroupName(input.group_id),
          join_request_id: input.join_request_id,
          user_id: input.requester_id,
          user_name: requester?.user_name ?? '',
          nickname: requester?.nickname ?? '',
          avatar_url: requester?.avatar_url ?? null,
        },
      });
    } catch {
      // không để lỗi thông báo làm hỏng việc gửi đơn
    }
  }

  // ============ Delete ============

  async hardDelete(input: { user_id: string; join_request_id: string }) {
    const { user_id, join_request_id } = input;

    const result = await this.groupJoinRequestRepo.delete({
      id: join_request_id,
      sender: { id: user_id } ,
      status : Group_Join_Request_Status.PENDING, // user only able to delete the pending one
    });
    if (result.affected === 0) {
      throw new NotFoundException({
        errorCode: 'user_or_join_group_request_not_found',
      });
    }
    return true;
  }

  // ==========================================================
  //                        ADMIN
  // ==========================================================

  // ============ Get One ============

  async adminGetOne(input: { join_request_id: string }) {
    const { join_request_id } = input;

    const { select , relations  } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    const request = await this.groupJoinRequestRepo.findOne({
      where: { id: join_request_id },
      relations ,
      select ,
    });

    if (!request)
      throw new NotFoundException({ errorCode: 'join_request_not_found' });

    return request;
  }

  // ============ Get Many ============

  async adminGetMany(input: { group_id: string; limit: number; page: number }) {
    const { group_id, limit, page } = input;

    const { select , relations  } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    return this.groupJoinRequestRepo.find({
      where: { group: { id: group_id } },
      relations ,
      select ,
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /**
   * Danh sách yêu cầu tham gia nhóm cho admin, có lọc.
   *
   * Trả kèm `sender` (người gửi) + `group` (nhóm) đã join để FE hiển thị trực
   * tiếp, không phải gọi thêm.
   */
  async adminFindMany(query: AdminGroupJoinRequestQueryDto) {
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.groupJoinRequestRepo.findAndCount({
      where: adminWhere({
        id: adminUuidLike(query.id),
        sender: { id: adminUuidLike(query.user_id) },
        group: { id: adminUuidLike(query.group_id) },
        status: query.status,
        created_at: adminCreatedRange(query),
      }),
      relations,
      select,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      withDeleted: query.with_deleted === true,
    });

    return adminPage({ items: items.map(markDeleted), total, page, limit });
  }

  // ============ Update (Admin) ============


  async adminUpdate(input: {
    body: any;
    sys_admin_id: string;
    join_request_id: string;
  }) {
    const { body, sys_admin_id, join_request_id } = input;

    const request = await this.groupJoinRequestRepo.findOne({
      where: { id: join_request_id },
      relations: { sender: true, group: true },
    });

    if (!request || request.status !== Group_Join_Request_Status.PENDING)
      throw new NotFoundException({ errorCode: 'join_request_not_found' });

    if (body.status === Group_Join_Request_Status_UPDATE.APPROVED) {
      await this.groupMemberService.addMember({
        group_id: request.group.id,
        user_id: request.sender.id,
      });
    }

    const result = await this.groupJoinRequestRepo.update(
      { id: join_request_id },
      {
        status: body.status,
        reviewer: { id: sys_admin_id },
        reviewed_at: new Date(),
      },
    );

    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'join_request_not_found' });

    const approved =
      body.status === Group_Join_Request_Status_UPDATE.APPROVED;

    await this.notifService
      .send({
        user_id: request.sender.id,
        type: approved
          ? User_Notif_Type.GROUP_JOIN_APPROVED
          : User_Notif_Type.GROUP_JOIN_REJECTED,
        content: {
          group_id: request.group.id,
          group_name: await this.getGroupName(request.group.id),
        },
      })
      .catch(() => undefined);

    return { success: true };
  }

  // ============ Delete (Admin) ============

  async adminHardDelete(input: { join_request_id: string }) {
    const { join_request_id } = input;

    const result = await this.groupJoinRequestRepo.delete({
      id: join_request_id,
      status: Group_Join_Request_Status.PENDING,
    });

    if (result.affected === 0) {
      throw new NotFoundException({ errorCode: 'join_request_not_found' });
    }
    return true;
  }
}