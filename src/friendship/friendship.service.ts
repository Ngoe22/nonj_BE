import {ConflictException, forwardRef, Inject, Injectable, NotFoundException} from '@nestjs/common';
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
  ) {
    this.friendShipFilterByRole = FilterDbField.create({
      labels: ['SA', 'me', 'friend'],
      fieldAndLabels: {
        id: ['SA', 'me'],
        be_friend_at: ['SA', 'me'],
        user: ['SA'],
        user_friend: {
          id: ['SA', 'me'],
          nickname: ['SA', 'me'],
          user_name: ['SA', 'me'],
          avatar_url: ['me'],
        },
        created_at: ['SA', ],
        updated_at: ['SA', ],
        deleted_at: ['SA'],
      },
      dataBases: {
        _main: Friendship,
        user: User,
        user_friend: User,
      },
      dataSource: this.dataSource,
      FE_permission: {
        undefined: ['me'],
      },
    });
  }

  // ==================== Get ====================

  async getMany(input: { user_id: string; page: number; limit: number }) {
    const { user_id, page, limit } = input;
    const { select, relations } = this.friendShipFilterByRole.buildQueryObject({
      label: 'me',
    });

    return this.friendshipRepo.find({
      where: { user: { id: user_id } },
      relations,
      select,
      order: { be_friend_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }



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
    const { user_id, friend_id, source_request } = body;

    await this.friendshipRepo.save({
      user: { id: user_id },
      user_friend: { id: friend_id },
      source_request: { id: source_request },
      be_friend_at: new Date(),
    });
    await this.friendshipRepo.save({
      user: { id: friend_id },
      user_friend: { id: user_id },
      source_request: { id: source_request },
      be_friend_at: new Date(),
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
        be_friend_at: new Date(),
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
      // PHẢI select cả khoá chính: where có relation mà select thiếu `id` thì
      // TypeORM sinh subquery alias sai -> 'column distinctAlias.Friendship_id does not exist'
      select: { id: true, deleted_at: true },
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
