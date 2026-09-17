import {ConflictException, Injectable, NotFoundException} from '@nestjs/common';
import {InjectDataSource, InjectRepository} from "@nestjs/typeorm";
import {DataSource, Repository} from "typeorm";
import {Friendship} from "./entities/friendship.entity.js";
import {FilterDbField} from "../_common/helper/filterQueryForRole.js";
import {Transactional} from "typeorm-transactional";
import {UserService} from "../user/user.service.js";


// ======================================================================

@Injectable()
export class FriendshipService {
  friendShipFilterByRole: FilterDbField<Friendship>;

  constructor(
      @InjectDataSource()
      private readonly dataSource: DataSource,
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    @InjectDataSource()
    private readonly userService: UserService,
  ) {
    this.friendShipFilterByRole = new FilterDbField({
      keyAndLabels: {
        id: ['admin', 'me'],
        user: ['admin', 'me'],
        user_friend: ['admin', 'me'],
        created_at: ['admin'],
        updated_at: ['admin' , 'me' ],
        deleted_at: ['admin'],
      },
      dataBase: Friendship,
      dataSource : this.dataSource

    });
  }

  // ==================== Get ====================

  async getMany(input: { user_id: string; page: number; limit: number }) {
    const { user_id, page, limit } = input;

    const user_select_obj =
      this.userService.userFilterByRole.buildQuerySelectObject({
        label: 'not_friend',
      });

    return this.friendshipRepo.find({
      where: { user: { id: user_id } },
      relations: { user_friend: true },
      select: {
        id: true,
        created_at: true,
        user_friend: user_select_obj,
      },
      order: { created_at: 'DESC' },
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
    const saveInfo1 = FilterDbField.turnObjInfoToRelationObj(
      {
        user: body.user_id,
        user_friend: body.friend_id,
        source_request: body.source_request,
      },
      ['user', 'user_friend', 'source_request'],
    );

    const saveInfo2 = FilterDbField.turnObjInfoToRelationObj(
      {
        user: body.friend_id,
        user_friend: body.user_id,
        source_request: body.source_request,
      },
      ['user', 'user_friend', 'source_request'],
    );

    await this.friendshipRepo.save(saveInfo1);
    await this.friendshipRepo.save(saveInfo2);

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

    const isFriend = this.isFriend(( {
      user_id , friend_id
    } ))
    if ( !isFriend ) throw new NotFoundException({ errorCode : 'not_friend' })

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
