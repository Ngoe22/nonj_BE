import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { UserNotif } from './entities/user_notif.entity.js';
import { User_Notif_Type } from './enum/user_notif.enum.js';
import { NotifGateway } from './user_notif.gateway.js';

/** Payload bắn qua socket — FE dùng để render + deep link */
export interface NotifSocketPayload {
  id: string;
  type: User_Notif_Type;
  content: object;
  is_read: boolean;
  created_at: Date;
}

@Injectable()
export class UserNotifService {
  constructor(
    @InjectRepository(UserNotif)
    private readonly notifRepo: Repository<UserNotif>,

    private readonly notifGateway: NotifGateway,
  ) {}

  // ============================================================
  // Tạo thông báo — mọi module khác gọi 2 hàm dưới đây
  // ============================================================

  async send(input: {
    user_id: string;
    type: User_Notif_Type;
    content: object;
  }) {
    const { user_id, type, content } = input;
    if (!user_id) return null;

    const notif = await this.notifRepo.save({
      user: { id: user_id },
      type,
      content,
      is_read: false,
    });

    this.emit(user_id, notif);
    return notif;
  }

  /**
   * Gửi cho nhiều người (vd: cả nhóm khi có post mới).
   * Tự loại trùng; `exclude_user_id` để không tự thông báo cho người gây ra
   * sự kiện.
   */
  async sendMany(input: {
    user_ids: string[];
    type: User_Notif_Type;
    content: object;
    exclude_user_id?: string;
  }) {
    const targets = [
      ...new Set(
        input.user_ids.filter(
          (id): id is string => !!id && id !== input.exclude_user_id,
        ),
      ),
    ];
    if (targets.length === 0) return [];

    const saved = await this.notifRepo.save(
      targets.map((user_id) => ({
        user: { id: user_id },
        type: input.type,
        content: input.content,
        is_read: false,
      })),
    );

    saved.forEach((notif, index) => this.emit(targets[index], notif));
    return saved;
  }

  /** Bắn realtime. Người offline vẫn thấy khi mở lại danh sách. */
  private emit(user_id: string, notif: UserNotif) {
    const payload: NotifSocketPayload = {
      id: notif.id,
      type: notif.type,
      content: notif.content,
      is_read: notif.is_read,
      created_at: notif.created_at,
    };
    this.notifGateway.emitToUser(user_id, 'notification', payload);
  }

  // ============================================================
  // Đọc / cập nhật trạng thái
  // ============================================================

  async findMany(input: { user_id: string; page: number; limit: number }) {
    const { user_id, page, limit } = input;
    return this.notifRepo.find({
      where: { user: { id: user_id } },
      // chỉ trả field FE cần — không lộ created_by/updated_by/deleted_* nội bộ
      select: {
        id: true,
        type: true,
        content: true,
        is_read: true,
        created_at: true,
      },
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

  /** Đánh dấu đã đọc một loạt id — FE gọi khi mở dropdown */
  async markManyAsRead(input: { user_id: string; notif_ids: string[] }) {
    if (input.notif_ids.length === 0) return true;

    await this.notifRepo.update(
      { user: { id: input.user_id }, id: In(input.notif_ids) },
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
