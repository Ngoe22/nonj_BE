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

@Injectable()
export class FriendRequestService {
  private friendReqFilterByRole: FilterDbField<FriendRequest>;

  constructor(
      @InjectDataSource()
      private readonly dataSource: DataSource,
    @InjectRepository(FriendRequest)
    private readonly requestRepo: Repository<FriendRequest>,
    private readonly userService: UserService,
    private readonly friendshipService: FriendshipService,
  ) {
    this.friendReqFilterByRole = new FilterDbField({
      keyAndLabels: {
        id: ['admin', 'me'],
        sender: ['admin', 'me'],
        receiver: ['admin', 'me'],
        status: ['admin', 'me'],
        created_at: ['admin', 'me'],
        updated_at: ['admin', 'me'],
      },
      dataBase: FriendRequest,
      dataSource : this.dataSource ,
    });
  }

  // =========== Get Many =================

  async get_many_request(input: {
    user_id: string;
    page: number;
    limit: number;
    data_for_role: string;
    type: 'outgoing_requests' | 'ingoing_requests';
  }) {
    const { user_id, page, limit, data_for_role, type } = input;

    const friendReqQueryObject =
      this.friendReqFilterByRole.buildQuerySelectObject({
        label: data_for_role,
      });
    const userQueryObject =
      this.userService.userFilterByRole.buildQuerySelectObject({
        label: 'not_friend',
      });

    const where =
      type === 'outgoing_requests'
        ? { sender: { id: user_id } , status : Friend_Request_Status.PENDING }
        : { receiver: { id: user_id } ,  status : Friend_Request_Status.PENDING };

    const relations =
      type === 'outgoing_requests' ? { receiver: true } : { sender: true };

    const select =
      type === 'outgoing_requests'
        ? { ...friendReqQueryObject, receiver: userQueryObject }
        : { ...friendReqQueryObject, sender: userQueryObject };

    return await this.requestRepo.find({
      where,
      relations,
      select,
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // =========== Create =================

  async add_request(body: any) {
    const { sender, receiver } = body;

    // isPending
    const [pendingFromMe, pendingFromThem] = await Promise.all([
      this.isPending(sender, receiver),
      this.isPending(receiver, sender),
    ]);
    if (pendingFromMe || pendingFromThem) {
      throw new ConflictException({ errorCode: 'request_already_pending' });
    }

    // is already friend
    const is_friend = await this.friendshipService.isFriend({
      user_id: sender,
      friend_id: receiver,
    });
    if (is_friend === 'is')
      throw new ConflictException({ errorCode: 'already_friends' });

    // create request
    await this.requestRepo.save(
      FilterDbField.turnObjInfoToRelationObj(body, ['sender', 'receiver']),
    );

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
}
