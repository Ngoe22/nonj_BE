import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {InjectDataSource, InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import { FriendRequest } from './entities/friend_request.entity.js';
import { FilterDbField } from '../_common/helper/filterQueryForRole.js';
import {Friend_Request_Status, UpdateRequestFromReceiverEnum} from './enum/friend_request.enum.js';
import { Transactional } from 'typeorm-transactional';
import { UserService } from '../user/user.service.js';
import {FriendshipService} from "../friendship/friendship.service.js";
import {User} from "../user/entities/user.entity.js";

@Injectable()
export class FriendRequestService {
  private filterByLabels: FilterDbField<FriendRequest, string>;

  constructor(
      @InjectDataSource()
      private readonly dataSource: DataSource,
    @InjectRepository(FriendRequest)
    private readonly requestRepo: Repository<FriendRequest>,
    private readonly userService: UserService,
    private readonly friendshipService: FriendshipService,
  ) {
    this.filterByLabels =  FilterDbField.create({
      labels :[  'SA' , 'outgoing_requests', 'ingoing_requests'] ,
      fieldAndLabels: {
        id: ['SA', 'outgoing_requests', 'ingoing_requests'],
        sender: {
          id :['SA', 'ingoing_requests'],
          name : ['SA', 'ingoing_requests'],
          user_name : ['SA', 'ingoing_requests'],
          avatar_url : [ 'ingoing_requests']
        } ,
        receiver:  {
          id :['SA', 'outgoing_requests'],
          name : ['SA', 'outgoing_requests'],
          user_name : ['SA', 'outgoing_requests'],
          avatar_url : [ 'outgoing_requests']
        },
        status: ['SA', 'outgoing_requests', 'ingoing_requests'],
        created_at: ['SA', 'outgoing_requests', 'ingoing_requests'],
        updated_at: ['SA', 'outgoing_requests', 'ingoing_requests'],
      },
      dataBases: {
        _main : FriendRequest ,
        sender: User ,
        receiver: User ,
      },
      dataSource : this.dataSource ,
    });
  }

  // =========== Get Many =================

  async get_many_request(input: {
    user_id: string;
    page: number;
    limit: number;
    type: 'outgoing_requests' | 'ingoing_requests';
  }) {
    const { user_id, page, limit, type } = input;

    const { relations , select } =
      this.filterByLabels.buildQueryObject({
        label: type,
      });

    const where =
      type === 'outgoing_requests'
        ? { sender: { id: user_id } , status : Friend_Request_Status.PENDING }
        : { receiver: { id: user_id } ,  status : Friend_Request_Status.PENDING };

    return await this.requestRepo.find({
      where,
      relations,
      select,
      skip: (page - 1) * limit,
      take: limit,
    });
  }


  // =========== Helper =================


  //

  async isPending(
      requestId: string,
      receiverId: string,
  ): Promise<boolean> {
    return this.requestRepo.exists({
      where: {
        receiver: { id: receiverId },
        sender: { id: requestId },
        status: Friend_Request_Status.PENDING,
      },
    });
  }



  // =========== Create =================

  async add_request(input : { sender_id : string  , receiver_id : string } ) {
    const { sender_id, receiver_id } = input;

    // isPending
    const [pendingFromMe, pendingFromThem] = await Promise.all([
      this.isPending(sender_id, receiver_id),
      this.isPending(receiver_id, sender_id),
    ]);
    if (pendingFromMe || pendingFromThem) {
      throw new ConflictException({ errorCode: 'request_already_pending' });
    }

    // is already friend
    const is_friend = await this.friendshipService.isFriend({
      user_id: sender_id,
      friend_id: receiver_id,
    });
    if (is_friend === 'is')
      throw new ConflictException({ errorCode: 'already_friends' });

    // create request
    await this.requestRepo.save({
      sender : { id: sender_id },
      receiver : { id: receiver_id },
    });

    return true;
  }

  // =========== Update =================

  @Transactional()
  async receiver_update(request_id: string, receiver_id: string, body: any) {
    // check is request is existed and pending
    const request = await this.requestRepo.findOne({
      where: {
        id: request_id,
        receiver: { id: receiver_id },
        status: Friend_Request_Status.PENDING,
      },
      select: { sender: true },
    });
    if (!request) {
      throw new NotFoundException({
        errorCode: 'request_not_found_or_not_owned',
      });
    }

    // update status accept or refuse
    await this.requestRepo.update(
      { id: request_id },
      { ...body, updated_by: receiver_id },
    );

    // if accept run add friend from friendship service
    if (body.status === UpdateRequestFromReceiverEnum.ACCEPTED) {
      await this.friendshipService.add_friend({
        user_id: request.sender.id,
        friend_id: receiver_id,
        source_request: request_id,
      });
    }
    return true;
  }

  // =========== Delete =================

  async soft_delete(request_id: string, user_id: string) {
    const result = await this.requestRepo.update(
      { sender: { id: user_id }, id: request_id },
      { deleted_at: new Date(), deleted_by: user_id },
    );

    if (result.affected === 0) {
      throw new NotFoundException({
        errorCode: 'request_not_found_or_not_owned',
      });
    }
    return true;
  }

  // ================================================
  //              ADMIN
  // ================================================

  async admin_get_one_request(input: {
    request_id: string;
  }) {
    const {request_id } = input;

    const { relations , select } =
        this.filterByLabels.buildQueryObject({
          label: 'SA',
        });

    return await this.requestRepo.findOne({
      where : { id : request_id },
      relations,
      select,
    });
  }



  async admin_get_many_request(input: {
    page: number;
    limit: number;
  }) {
    const {  page, limit } = input;

    const { relations , select } =
        this.filterByLabels.buildQueryObject({
          label: 'SA',
        });

    return await this.requestRepo.find({
      where : {},
      relations,
      select,
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async admin_get_many_user_sending_request(input: {
    sender_id: string;
    page: number;
    limit: number;
  }) {
    const { sender_id, page, limit } = input;

    const { relations , select } =
        this.filterByLabels.buildQueryObject({
          label: 'SA',
        });

    return await this.requestRepo.find({
      where : { sender : { id : sender_id}  },
      relations,
      select,
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async admin_get_many_user_receiving_request(input: {
    receiver_id: string;
    page: number;
    limit: number;
  }) {
    const { receiver_id, page, limit } = input;

    const { relations , select } =
        this.filterByLabels.buildQueryObject({
          label: 'SA',
        });

    return await this.requestRepo.find({
      where : { receiver : { id : receiver_id}  },
      relations,
      select,
      skip: (page - 1) * limit,
      take: limit,
    });
  }



  async admin_soft_delete(request_id: string) {
    const result = await this.requestRepo.update(
        { id: request_id },
        { deleted_at: new Date() },
    );
    if (result.affected === 0) {
      throw new NotFoundException({ errorCode: 'request_not_found' });
    }
    return true;
  }





}
