import {ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectDataSource, InjectRepository} from "@nestjs/typeorm";
import {DataSource, Repository} from "typeorm";
import {Friendship} from "./entities/friendship.entity.js";
import {FilterDbField} from "../_common/helper/filterQueryForRole.js";
import {Transactional} from "typeorm-transactional";
import {UserService} from "../user/user.service.js";
import {FriendRequest} from "../friend_request/entities/friend_request.entity.js";
import {FriendRequestService} from "../friend_request/friend_request.service.js";
import {User} from "../user/entities/user.entity.js";


// ======================================================================

@Injectable()
export class FriendshipService {
  private friendShipFilterByRole: FilterDbField<Friendship | User, string>;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    @InjectDataSource()
    private readonly userService: UserService,
    @InjectDataSource()
    private readonly friendRequestService: FriendRequestService,
  ) {
    this.friendShipFilterByRole =  FilterDbField.create({

      labels : [ 'SA' , 'me' , 'friend' ] ,
      fieldAndLabels: {
        id: ['SA', 'me'],
        user: ['SA',],
        user_friend: {
          id : ['SA', 'me'],
          name : ['SA', 'me'],
          user_name : ['SA', 'me'],
          avatar_url : [ 'me'],
        } ,
        created_at: ['SA' , 'me'],
        updated_at: ['SA', 'me'],
        deleted_at: ['SA'],
      },
      dataBases: {
        _main: Friendship ,
        user : User ,
        user_friend : User
      },
      dataSource: this.dataSource,
      FE_permission : {
        undefined : ['me']
      }
    });
  }

  // ==================== Get ====================

  async getMany(input: { user_id: string; page: number; limit: number }) {
    const { user_id, page, limit } = input;
    const { select , relations } = this.friendShipFilterByRole.buildQueryObject({label:'me'})

    return this.friendshipRepo.find({
      where: { user: { id: user_id } },
      relations ,
      select ,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  // ================= Search friend

  async searchUserName(input: {  // search One
    requester_id: string;
    search_target_username: string;
  }){

    const { info , is_friend } = await this.userService.getOtherInfoByUserName(input);

    const permission = {
      add_friend: false,
      cancel_request_friend: false,
      accept_request_friend: false,
      unfriend: false,
    }


    if (!is_friend) {
      const amISending = await this.friendRequestService.isPending(input.requester_id, info.id);
      const amIReceiving = await this.friendRequestService.isPending(info.id, input.requester_id);


      if (amISending) {
        permission.cancel_request_friend = true
      }  else if (amIReceiving) {
        permission.accept_request_friend = true
      } else {
          permission.add_friend = true;
      }
    } else  {
      permission.unfriend = true;
    }

    return { ...info , is_friend , permission  };

  };

  // ==================== Create ====================

  async add_friend(body: {
    user_id: string;
    friend_id: string;
    source_request: string;
  }) {
    const isFriend = await this.isFriend({
      user_id: body.user_id,
      friend_id: body.friend_id,
    });

    if (isFriend === 'never') return this.create_friendship(body);
    if (isFriend === 'was') return this.readd_friend(body);
    throw new ConflictException({ errorCode: 'already_friends' });
  }

  @Transactional()
  private async create_friendship(body: {
    user_id: string;
    friend_id: string;
    source_request: string;
  }) {

    const  {  user_id, friend_id , source_request } = body;

    await this.friendshipRepo.save({
      user :  { id : user_id } ,
      user_friend : { id  : friend_id } ,
      source_request : { id : source_request },
    });
    await this.friendshipRepo.save({
      user :  { id : friend_id } ,
      user_friend : { id  : user_id } ,
      source_request : { id : source_request },
    });

    return true;
  }

  private async readd_friend(input: {
    user_id: string;
    friend_id: string;
    source_request: string;
  }) {
    const { user_id, friend_id, source_request } = input;

    return this.update_2side(
      { user_id, friend_id },
      {
        deleted_at: null,
        deleted_by: null,
        source_request: { id: source_request },
      },
      'add_friend_info_not_found',
    );
  }

  // ==================== Delete ====================

  async delete(input: { user_id: string; friend_id: string }) {
    const { user_id, friend_id } = input;

    const isFriend = this.isFriend({
      user_id,
      friend_id,
    });
    if (!isFriend) throw new NotFoundException({ errorCode: 'not_friend' });

    return this.update_2side(
      input,
      { deleted_at: new Date(), deleted_by: user_id },
      'delete_info_not_found',
    );
  }

  // ==================== Check ====================

  async isFriend(input: {
    user_id: string;
    friend_id: string;
  }): Promise<'never' | 'was' | 'is'> {
    const { user_id, friend_id } = input;

    const result = await this.friendshipRepo.findOne({
      where: { user: { id: user_id }, user_friend: { id: friend_id } },
      select: { deleted_at: true },
      withDeleted: true,
    });

    if (!result) return 'never';
    if (result.deleted_at) return 'was';
    return 'is';
  }

  // ======= private ======

  // ==================== Update ====================

  @Transactional()
  private async update_2side(
    id: { user_id: string; friend_id: string },
    body: any,
    errorCode: string,
  ) {
    const { user_id, friend_id } = id;

    const result1 = await this.friendshipRepo.update(
      { user: { id: user_id }, user_friend: { id: friend_id } },
      body,
    );
    if (result1.affected === 0) {
      throw new NotFoundException({ errorCode });
    }

    const result2 = await this.friendshipRepo.update(
      { user: { id: friend_id }, user_friend: { id: user_id } },
      body,
    );
    if (result2.affected === 0) {
      throw new NotFoundException({ errorCode });
    }

    return true;
  }
}
