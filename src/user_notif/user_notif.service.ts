// user_notif.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserNotif } from './entities/user_notif.entity.js';
import { User_Notif_Type } from './enum/user_notif.enum.js';
import { NotifGateway } from './user_notif.gateway.js';

@Injectable()
export class UserNotifService {
  constructor(
    @InjectRepository(UserNotif)
    private readonly notifRepo: Repository<UserNotif>,
    private readonly notifGateway: NotifGateway,
  ) {}

  // Hàm dùng chung — mọi module khác (FriendRequest, GroupJoinRequest, PostAnswer...) gọi hàm này để gửi thông báo
  async send(input: {
    user_id: string;
    type: User_Notif_Type;
    content: object;
  }) {
    const { user_id, type, content } = input;

    const notif = await this.notifRepo.save({
      user: { id: user_id },
      type,
      content,
      is_read: false,
    });

    // bắn realtime tới đúng user đang online — nếu offline, họ vẫn thấy khi load lại danh sách notif
    this.notifGateway.emitToUser(user_id, 'notification', {
      id: notif.id,
      type: notif.type,
      content: notif.content,
      created_at: notif.created_at,
    });

    return notif;
  }

  async findMany(input: { user_id: string; page: number; limit: number }) {
    const { user_id, page, limit } = input;
    return this.notifRepo.find({
      where: { user: { id: user_id } },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  async markAsRead(input: { user_id: string; notif_id: string }) {
    const result = await this.notifRepo.update(
      { id: input.notif_id, user: { id: input.user_id } },
      { is_read: true },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'notif_not_found' });
    return true;
  }

  async markAllAsRead(input: { user_id: string }) {
    await this.notifRepo.update(
      { user: { id: input.user_id }, is_read: false },
      { is_read: true },
    );
    return true;
  }

  async countUnread(input: { user_id: string }): Promise<number> {
    return this.notifRepo.count({
      where: { user: { id: input.user_id }, is_read: false },
    });
  }
}
