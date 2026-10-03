import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

import { PostAnswer } from '../../post_answer/entities/post_answer.entity.js';
import { Post } from '../../post/entities/post.entity.js';
import { QuestionPreparation } from '../../question_preparation/entities/question_preparation.entity.js';
import { PostCollection } from '../../group/entities/post_collection.entity.js';
import { QuestionPreparationCollection } from '../../question_preparation/entities/question_preparation_collection.entity.js';
import { GroupMember } from '../../group/entities/group_member.entity.js';
import { GroupJoinRequest } from '../../group/entities/group_join_request.entity.js';
import { Friendship } from '../../friendship/entities/friendship.entity.js';
import { FriendRequest } from '../../friend_request/entities/friend_request.entity.js';
import { Group } from '../../group/entities/group.entity.js';
import { Report } from '../../report/entities/report.entity.js';
import { UserNotif } from '../../user_notif/entities/user_notif.entity.js';
import { RefreshToken } from '../../refresh_token/entities/refresh_token.entity.js';
import { ForgetPasswordOtp } from '../../auth/entities/forget_password_otp.entity.js';

/** Số bản ghi bị xoá cứng ở mỗi bảng */
export type PurgeReport = Record<string, number>;

/** Ngày giữ mặc định trước khi xoá cứng bản ghi đã xoá mềm */
const DEFAULT_RETENTION_DAYS = 14;

/**
 */
@Injectable()
export class DataPurgeService {
  private readonly logger = new Logger(DataPurgeService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}



  get retentionDays(): number {
    const raw = Number(process.env.PURGE_AFTER_DAYS);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RETENTION_DAYS;
  }

  /** 3h sáng mỗi ngày */
  @Cron('0 3 * * *', { name: 'purge-soft-deleted' })
  async handleCron() {
    const report = await this.purge();
    const total = Object.values(report).reduce((sum, n) => sum + n, 0);

    if (total === 0) {
      this.logger.log('Không có dữ liệu nào cần dọn');
      return;
    }

    this.logger.log(
      `Đã xoá cứng ${total} bản ghi: ${JSON.stringify(report)}`,
    );
  }

  async purge(): Promise<PurgeReport> {
    const days = this.retentionDays;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const report: PurgeReport = {};

    // ------------------------------------------------------------------
    // Bảng nghiệp vụ — xoá mềm quá `days` ngày
    // Thứ tự con -> cha. Mỗi bảng là 1 field trong report để log dễ đọc.
    // ------------------------------------------------------------------
    const softDeleted: [string, EntityTarget<ObjectLiteral>][] = [
      ['post_answer', PostAnswer],
      ['post', Post],
      ['question_preparation', QuestionPreparation],
      ['post_collection', PostCollection],
      ['question_preparation_collection', QuestionPreparationCollection],
      ['group_member', GroupMember],
      ['group_join_request', GroupJoinRequest],
      ['friendship', Friendship],
      ['friend_request', FriendRequest],
      ['group', Group],
      ['report', Report],
    ];

    for (const [name, entity] of softDeleted) {
      report[name] = await this.deleteWhere(
        entity,
        'deleted_at IS NOT NULL AND deleted_at < :cutoff',
        { cutoff },
      );
    }

    // ------------------------------------------------------------------
    // Bảng kỹ thuật — mỗi bảng một quy tắc riêng
    // ------------------------------------------------------------------



    // Thông báo: quá `days` ngày là dọn, không cần biết đã xoá mềm hay chưa
    report.user_notif = await this.deleteWhere(
      UserNotif,
      'created_at < :cutoff',
      { cutoff },
    );

    // Token: đã thu hồi hoặc xoá mềm thì dọn ngay, không chờ
    report.refresh_token = await this.deleteWhere(
      RefreshToken,
      'revoked_at IS NOT NULL OR deleted_at IS NOT NULL',
      {},
    );

    // OTP: hết hạn VÀ đã quá `days` ngày
    report.forget_password_otp = await this.deleteWhere(
      ForgetPasswordOtp,
      'expires_at < :cutoff',
      { cutoff },
    );

    // `user` khong xoa  — tài khoản người dùng giữ vĩnh viễn.

    return report;
  }

  /** Xoá cứng theo điều kiện, trả về số dòng bị xoá */
  private async deleteWhere(
    entity: EntityTarget<ObjectLiteral>,
    where: string,
    parameters: Record<string, unknown>,
  ): Promise<number> {
    const result = await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(entity)
      .where(where, parameters)
      .execute();

    return result.affected ?? 0;
  }
}
