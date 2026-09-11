import { Injectable, NotFoundException } from '@nestjs/common';
import { FilterDbField } from '../../../_common/helper/filterQueryForRole.js';
import { GroupJoinRequest } from '../../entities/group_join_request.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group_Join_Request_Status } from '../../enum/group.enum.js';



//======================================


@Injectable()
export class GroupJoinRequestService {
  private filterByRoles: FilterDbField<GroupJoinRequest>;

  constructor(
    @InjectRepository(GroupJoinRequest)
    private groupJoinRequestRepo: Repository<GroupJoinRequest>,
  ) {
    this.filterByRoles = new FilterDbField({
      keyAndLabels: {
        id: ['founder', 'admin', 'member'],
        sender: ['founder', 'admin', 'member'],
        group: ['founder', 'admin', 'member'],
        status: ['founder', 'admin', 'member'],
        reviewer: ['founder', 'admin'],
        review_at: ['founder', 'admin'],
      },
      dataBase: GroupJoinRequest,
    });
  }

  // ============ Get Many ============

  async getMany(input: {
    group_id: string;
    group_admin_id: string;
    limit: number;
    page: number;
  }) {
    const { group_id, group_admin_id, limit, page } = input;

    // role is founder , admin
    // if system admin not check

    const role = 'admin'; // fake , real date from check function
    const select = this.filterByRoles.buildQuerySelectObject({ label: role });

    return await this.groupJoinRequestRepo.find({
      where: { group: { id: group_id } },
      select,
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // ============ Create ============

  async create(body: any) {

    // group service check isMember
    // if already - error

    const updateBody = FilterDbField.turnObjInfoToRelationObj(body, [
      'sender',
      'group',
    ]);
    await this.groupJoinRequestRepo.save(updateBody);

    return true;
  }

  // ============ Update ============

  async update(input: {
    body: any;
    user_id: string;
    group_admin_id: string;
    join_request_id: string;
  }) {
    const { body, user_id, group_admin_id, join_request_id } = input;

    // group mem service check group_admin_id

    //check user is groupmenber
    // is error
    // was update and rejoin
    // never update and call menber service to add

    const updateReq = await this.groupJoinRequestRepo.update(
      {
        id: join_request_id,
        sender: { id: user_id },
        status: Group_Join_Request_Status.PENDING,
      },
      {
        ...body,
        reviewer: { id: group_admin_id },
        review_at: new Date(),
      },
    );

    if (updateReq.affected === 0)
      throw new NotFoundException({
        errorCode: 'user_or_join_group_request_not_found',
      });

    return true;
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

  // ============ Get One (Admin) ============

  async adminGetOne(input: { join_request_id: string }) {
    const { join_request_id } = input;

    const select = this.filterByRoles.buildQuerySelectObject({
      label: 'founder',
    });

    const request = await this.groupJoinRequestRepo.findOne({
      where: { id: join_request_id },
      select,
    });

    if (!request)
      throw new NotFoundException({ errorCode: 'join_request_not_found' });

    return request;
  }

  // ============ Get Many (Admin) ============

  async adminGetMany(input: { group_id: string; limit: number; page: number }) {
    const { group_id, limit, page } = input;

    const select = this.filterByRoles.buildQuerySelectObject({
      label: 'founder',
    });

    return this.groupJoinRequestRepo.find({
      where: { group: { id: group_id } },
      select,
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