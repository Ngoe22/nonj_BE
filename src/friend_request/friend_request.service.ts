import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryDeepPartialEntity, Repository } from 'typeorm';
import { FriendRequest } from './entities/friend_request.entity.js';
import { FilterDbField } from '../_common/helper/filterQueryForRole.js';
import { Friend_Request_Status } from './enum/friend_request.enum.js';
import { UpdateRequestFromReceiverDto } from './dto/friend_request.dto.js';
import { Transactional } from 'typeorm-transactional';
import { UserService } from '../user/user.service.js';

@Injectable()
export class FriendRequestService {
  private dataFilterByRole: FilterDbField<FriendRequest>;

  constructor(
    @InjectRepository(FriendRequest)
    private readonly requestRepo: Repository<FriendRequest>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
  ) {
    this.dataFilterByRole = new FilterDbField({
      keyAndLabels: {
        id: ['admin', 'me'],
        friend_request_sender: ['admin', 'me'],
        friend_request_receiver: ['admin', 'me'],
        status: ['admin', 'me'],
        created_at: ['admin', 'me'],
        updated_at: ['admin', 'me'],
      },
      dataBase: FriendRequest,
      dataSource,
    });
  }

  async get_many_sending_request(input: {
    user_id: string;
    page: number;
    limit: number;
    role: string;
  }) {


    const { user_id, page, limit, role } = input;

    const friendReqQueryObject = this.dataFilterByRole.buildQuerySelectObject({
      label: role
    });
    const userQueryObject =
      this.userService.userFilterByRole.buildQuerySelectObject({
        label: "other",
      });


    const result = await this.requestRepo.find({
      where: { friend_request_sender: { id: user_id } },
      relations: { friend_request_receiver: true },
      select: {
        ...friendReqQueryObject,
        friend_request_receiver: userQueryObject,
      },
      skip: (page - 1) * limit,
      take: limit,
    });


    //
    // return this.requestRepo
    //   .createQueryBuilder(tableAlias)
    //   .select(queryArray)
    //   .where({ friend_request_sender: { id: user_id } })
    //   .skip((page - 1) * limit)
    //   .take(limit)
    //   .getMany();
  }

  async get_many_pending_request(input: {
    user_id: string;
    page: number;
    limit: number;
  }) {}

  async add_request(body: any) {
    const { friend_request_sender, friend_request_receiver } = body;

    // isPending
    if (await this.isPending(friend_request_sender, friend_request_receiver))
      throw new ConflictException({ errorCode: 'request_already_pending' });

    // isFriend  | Friendship Service
    //
    //
    //
    //

    // create

    return await this.requestRepo.save(
      FilterDbField.turnObjInfoToRelationObj(body, [
        'friend_request_sender',
        'friend_request_receiver',
      ]),
    );
  }

  @Transactional()
  async sender_update(request_id: string, receiver_id: string, body: any) {
    const result = await this.requestRepo.update(
      {
        friend_request_receiver: { id: receiver_id },
        id: request_id,
        status: Friend_Request_Status.PENDING,
      },
      { ...body, updated_at: new Date() },
    );

    if (result.affected === 0) {
      throw new NotFoundException({
        errorCode: 'request_not_found_or_not_owned',
      });
    }

    // friendship service . add friend

    return 'success';
  }

  async soft_delete(request_id: string, user_id: string) {
    const result = await this.requestRepo.update(
      {
        friend_request_sender: { id: user_id },
        id: request_id,
      },
      { deleted_at: new Date(), deleted_by: user_id },
    );

    if (result.affected === 0) {
      throw new NotFoundException({
        errorCode: 'request_not_found_or_not_owned',
      });
    }
    return 'success';
  }

  private async isPending(
    requestId: string,
    receiverId: string,
  ): Promise<boolean> {
    return this.requestRepo.exists({
      where: {
        friend_request_receiver: { id: receiverId },
        friend_request_sender: { id: requestId },
        status: Friend_Request_Status.PENDING,
      },
    });
  }
}
