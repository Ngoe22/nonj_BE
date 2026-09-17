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


//======================================


@Injectable()
export class GroupJoinRequestService {
  private filterByRoles: FilterDbField<GroupJoinRequest>;

  constructor(
      @InjectDataSource()
      private readonly dataSource: DataSource,
    @InjectRepository(GroupJoinRequest)
    private groupJoinRequestRepo: Repository<GroupJoinRequest>,
    //
    private readonly groupMemberService: GroupMemberService,
    private readonly groupService: GroupService,

  ) {
    this.filterByRoles = new FilterDbField({
      keyAndLabels: {
        id: ['SA' , 'founder', 'admin', 'member' , 'unjoin'],
        sender: ['SA' ,'founder', 'admin', 'member' , 'unjoin'],
        group: ['SA' ,'founder', 'admin', 'member' , 'unjoin'],
        status: ['SA' ,'founder', 'admin', 'member' , 'unjoin'],
        reviewer: ['SA' ],
        reviewed_at: ['SA' ],
        created_time : ['SA' ,'founder', 'admin', 'member' , 'unjoin'],
      },
      dataBase: GroupJoinRequest,
      dataSource : this.dataSource
    });
  }

  // ============ Helper ============

   private async blockExistedMemRequest( input :  { group_id :string , user_id : string } ) {
      const { group_id , user_id } = input;
      const isMem = await  this.groupMemberService.isMember({
         group_id , user_id
       })
       if ( isMem === 'is' ) return new ConflictException({ errorCode : 'already_in_group' });
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
    const select = this.filterByRoles.buildQuerySelectObject({ label: role });

    return await this.groupJoinRequestRepo.find({
      where: { group: { id: group_id  }  , status : Group_Join_Request_Status.PENDING},
      relations : { sender : true } ,
      select : {
        ...select ,
        sender : {
            id : true ,
            user_name : true,
            nickname : true,
            avatar_url : true,
        }
      },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  async getManyForUser(input: {
    user_id: string;
    limit: number;
    page: number;
  }) {
    const { user_id, limit, page } = input;

    const select = this.filterByRoles.buildQuerySelectObject({ label: 'unjoin' });

    return await this.groupJoinRequestRepo.find({
      where: { sender: { id: user_id } },
      relations : { group : true } ,
      select : {
        ...select ,
        group : {
          id   : true ,
          name : true ,
          slug : true ,
        }
      },
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
        await this.blockExistedMemRequest( { group_id , user_id:requester_id } )
        await this.groupJoinRequestRepo.save({
          sender: { id : requester_id } ,
          group : { id : group_id },
          created_by : requester_id,
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

     await this.groupMemberService.checkActorRoleBeforeAction({
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
      }
    );
    if (updateReq.affected === 0)
      throw new NotFoundException({
        errorCode: 'user_or_join_group_request_not_found',
      });

    return body.status;
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

    const select = this.filterByRoles.buildQuerySelectObject({
      label: 'SA',
    });

    const request = await this.groupJoinRequestRepo.findOne({
      where: { id: join_request_id },
      relations : { sender : true ,  group : true} ,
      select : {
        ...select ,
        sender : {
          id : true ,
          user_name : true,
          nickname : true,
        } ,
        group : {
          id : true ,
          slug : true,
          name : true,
        }
      },
    });

    if (!request)
      throw new NotFoundException({ errorCode: 'join_request_not_found' });

    return request;
  }

  // ============ Get Many ============

  async adminGetMany(input: { group_id: string; limit: number; page: number }) {
    const { group_id, limit, page } = input;

    const select = this.filterByRoles.buildQuerySelectObject({
      label: 'SA',
    });

    return this.groupJoinRequestRepo.find({
      where: { group: { id: group_id } },
      relations : { sender : true } ,
      select : {
        ...select ,
        sender : {
          id : true ,
          user_name : true,
          nickname : true,
        }
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // ============ Update (Admin) ============

  async adminUpdate(input: {
    body: any;
    sys_admin_id: string;
    join_request_id: string;
  }) {
    const { body, sys_admin_id, join_request_id } = input;

    const result = await this.groupJoinRequestRepo.update(
      { id: join_request_id },
      { ...body, reviewer: { id: sys_admin_id }, review_at: new Date() },
    );

    if (result.affected === 0) {
      throw new NotFoundException({ errorCode: 'join_request_not_found' });
    }
    return true;
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