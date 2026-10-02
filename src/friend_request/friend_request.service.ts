import {
  ConflictException, forwardRef, Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {InjectDataSource, InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import { FriendRequest } from './entities/friend_request.entity.js';
import { FilterDbField } from '../_common/helper/filterQueryForRole.js';
import { AdminFriendRequestQueryDto } from './dto/admin-friend-request-query.dto.js';
import {
  adminCreatedRange,
  adminLike,
  adminPage,
  adminUuidLike,
  markDeleted,
  adminWhere,
} from '../_common/helper/admin_query.helper.js';
import {Friend_Request_Status, UpdateRequestFromReceiverEnum} from './enum/friend_request.enum.js';
import { Transactional } from 'typeorm-transactional';
import { UserService } from '../user/user.service.js';
import {FriendshipService} from "../friendship/friendship.service.js";
import {User} from "../user/entities/user.entity.js";
import { UserNotifService } from '../user_notif/user_notif.service.js';
import { User_Notif_Type } from '../user_notif/enum/user_notif.enum.js';

@Injectable()
export class FriendRequestService {
  private filterByLabels: FilterDbField<FriendRequest, string>;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(FriendRequest)
    private readonly requestRepo: Repository<FriendRequest>,
    private readonly friendshipService: FriendshipService,
    private readonly notifService: UserNotifService,
  ) {
    this.filterByLabels = FilterDbField.create({
      labels: ['SA', 'outgoing_requests', 'ingoing_requests'],
      fieldAndLabels: {
        id: ['SA', 'outgoing_requests', 'ingoing_requests'],
        sender: {
          id: ['SA', 'ingoing_requests'],
          nickname: ['SA', 'ingoing_requests'],
          user_name: ['SA', 'ingoing_requests'],
          avatar_url: ['SA', 'ingoing_requests'],
        },
        receiver: {
          id: ['SA', 'outgoing_requests'],
          nickname: ['SA', 'outgoing_requests'],
          user_name: ['SA', 'outgoing_requests'],
          avatar_url: ['SA', 'outgoing_requests'],
        },
        status: ['SA', 'outgoing_requests', 'ingoing_requests'],
        created_at: ['SA', 'outgoing_requests', 'ingoing_requests'],
        updated_at: ['SA'],
        // admin cần thấy trạng thái xoá mềm
        deleted_at: ['SA'],
      },
      dataBases: {
        _main: FriendRequest,
        sender: User,
        receiver: User,
      },
      dataSource: this.dataSource,
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

    const { relations, select } = this.filterByLabels.buildQueryObject({
      label: type,
    });

    const where =
      type === 'outgoing_requests'
        ? { sender: { id: user_id }, status: Friend_Request_Status.PENDING }
        : { receiver: { id: user_id }, status: Friend_Request_Status.PENDING };

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

  async isPending(requestId: string, receiverId: string): Promise<boolean> {
    return this.requestRepo.exists({
      where: {
        receiver: { id: receiverId },
        sender: { id: requestId },
        status: Friend_Request_Status.PENDING,
      },
    });
  }

  // =========== Create =================

  async add_request(input: { sender_id: string; receiver_id: string }) {
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
    const saved = await this.requestRepo.save({
      sender: { id: sender_id },
      receiver: { id: receiver_id },
    });

    const sender = await this.getUserBrief(sender_id);

    await this.notifService
      .send({
        user_id: receiver_id,
        type: User_Notif_Type.FRIEND_REQUEST,
        content: {
          request_id: saved.id,
          user_id: sender_id,
          user_name: sender?.user_name ?? '',
          nickname: sender?.nickname ?? '',
          avatar_url: sender?.avatar_url ?? null,
        },
      })
      .catch(() => undefined);

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
      select: { id: true, sender: { id: true } },
      relations: { sender: true },
    });
    if (!request) {
      throw new NotFoundException({
        errorCode: 'request_not_found_or_not_owned',
      });
    }

    // update status accept or refuse
    await this.requestRepo.update(
      { id: request_id },
      { ...body, updated_by: receiver_id,
        deleted_at: new Date()  // for cronjob
      },
    );

    // if accept run add friend from friendship service
    const accepted =
      body.status === UpdateRequestFromReceiverEnum.ACCEPTED;

    if (accepted) {
      await this.friendshipService.add_friend({
        user_id: request.sender.id,
        friend_id: receiver_id,
        source_request: request_id,
      });
    }

    const responder = await this.getUserBrief(receiver_id);

    await this.notifService
      .send({
        user_id: request.sender.id,
        type: User_Notif_Type.FRIEND_RESPONSE,
        content: {
          request_id,
          user_id: receiver_id,
          user_name: responder?.user_name ?? '',
          nickname: responder?.nickname ?? '',
          avatar_url: responder?.avatar_url ?? null,
          accepted,
        },
      })
      .catch(() => undefined);

    return true;
  }

  /** Lấy tên/avatar tối thiểu để nhét vào nội dung thông báo */
  private async getUserBrief(user_id: string) {
    return this.dataSource.getRepository(User).findOne({
      where: { id: user_id },
      select: { id: true, user_name: true, nickname: true, avatar_url: true },
    });
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

  async admin_get_one_request(input: { request_id: string }) {
    const { request_id } = input;

    const { relations, select } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    return await this.requestRepo.findOne({
      where: { id: request_id },
      relations,
      select,
    });
  }

  /**
   * Danh sách QUAN HỆ cho admin, có lọc.
   *
   * `user_name` tìm ở CẢ HAI phía (người gửi HOẶC người nhận) — TypeORM nhận
   * mảng `where` và hiểu đó là OR.
   */
  async adminFindMany(query: AdminFriendRequestQueryDto) {
    const { relations, select } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const base = {
      id: adminUuidLike(query.id),
      status: query.status,
      created_at: adminCreatedRange(query),
      sender: { user_name: adminLike(query.sender_user_name) },
      receiver: { user_name: adminLike(query.receiver_user_name) },
    };

    const byAnySide = query.user_name?.trim();

    const [items, total] = await this.requestRepo.findAndCount({
      where: adminWhere(
        byAnySide
          ? [
              { ...base, sender: { user_name: adminLike(query.user_name) } },
              { ...base, receiver: { user_name: adminLike(query.user_name) } },
            ]
          : base,
      ),
      relations,
      select,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      withDeleted: query.with_deleted === true,
    });

    return adminPage({ items: items.map(markDeleted), total, page, limit });
  }

  /** Khôi phục một quan hệ đã bị xoá mềm */
  async adminRestore(request_id: string) {
    const result = await this.requestRepo.restore({ id: request_id });

    if (!result.affected)
      throw new NotFoundException({
        errorCode: 'friend_request_not_found_or_not_deleted',
      });

    return this.admin_get_one_request({ request_id });
  }

  async admin_get_many_user_sending_request(input: {
    sender_id: string;
    page: number;
    limit: number;
  }) {
    const { sender_id, page, limit } = input;

    const { relations, select } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    return await this.requestRepo.find({
      where: { sender: { id: sender_id } },
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

    const { relations, select } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    return await this.requestRepo.find({
      where: { receiver: { id: receiver_id } },
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
