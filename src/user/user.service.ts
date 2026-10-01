import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import {CreateUserDto} from './dto/create-user.dto.js';
import {UpdateUserDto} from './dto/update-user.dto.js';
import {AdminUpdateUserDto} from './dto/admin-update-user.dto.js';
import { AdminUserQueryDto } from './dto/admin-user-query.dto.js';
import {
  adminCreatedRange,
  adminLike,
  adminPage,
  adminUuidLike,
  markDeleted,
  adminWhere,
} from '../_common/helper/admin_query.helper.js';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {User} from "./entities/user.entity.js";
import { Transactional } from 'typeorm-transactional';
import { projectBcrypt } from '../_common/helper/customBcrypt.js';
import { FilterDbField } from '../_common/helper/filterQueryForRole.js';
import { FriendRequest } from '../friend_request/entities/friend_request.entity.js';
import { FriendRequestService } from '../friend_request/friend_request.service.js';

// ==========================================


@Injectable()
export class UserService {
  filterByLabels: FilterDbField<User, string>;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    //
    private readonly friendRequestService: FriendRequestService,
  ) {
    // ============================== Filter DB & QueryField

    this.filterByLabels = FilterDbField.create({
      labels: ['SA', 'for_auth', 'me', 'friend', 'not_friend'],
      fieldAndLabels: {
        id: ['SA', 'for_auth', 'me', 'friend', 'not_friend'],
        email: ['SA', 'for_auth', 'me'],
        user_name: ['SA', 'for_auth', 'me', 'friend', 'not_friend'],
        nickname: ['SA', 'for_auth', 'me', 'friend', 'not_friend'],
        bio: ['SA', 'for_auth', 'me', 'friend'],
        avatar_url: ['SA', 'for_auth', 'me', 'friend', 'not_friend'],
        role: ['SA', 'for_auth', 'me'],
        status: ['SA', 'for_auth'],
        created_at: ['SA'],
        // admin cần thấy trạng thái + mốc cập nhật/xoá mềm
        updated_at: ['SA'],
        deleted_at: ['SA'],
        password: ['for_auth'],
      },
      dataBases: {
        _main: User,
      },
      dataSource: this.dataSource,
    });

    // ==============================
  }

  private async checkPermissionBeforeGetOthersInfo(input: {
    requester_id: string;
    search_target_id?: string;
    search_target_username?: string;
  }) {}

  // ==============================


  async  checkUserNameExist(user_name:string){
    return await this.userRepository.exists({ where: { user_name: user_name } });
  }



  async creatUser(body: CreateUserDto) {
    const result = await this.userRepository.save(body);
    return this.filterByLabels.filterDataOfQueryResult({
      object: result,
      label: 'me',
    });
  }

  // ==============================

  async getInfoForEmailLogin(email: string) {
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'for_auth',
    });

    return await this.userRepository.findOne({
      where: { email: email },
      select,
    });
  }

  //

  async getOtherInfoById(input: {
    requester_id: string;
    search_target_id: string;
  }) {
    return this.getOtherInfo({
      requester_id: input.requester_id,
      condition: { id: input.search_target_id },
    });
  }

  // =============== SEARCH =====================

  async getOtherInfoByUserName(input: {
    requester_id: string;
    search_target_username: string;
  }) {
    const { is_friend, info } = await this.getOtherInfo({
      requester_id: input.requester_id,
      condition: { username: input.search_target_username },
    });

    const permission = {
      add_friend: false,
      cancel_request_friend: false,
      accept_request_friend: false,
      unfriend: false,
    };

    if (!is_friend) {
      const amISending = await this.friendRequestService.isPending(
        input.requester_id,
        info.id,
      );
      const amIReceiving = await this.friendRequestService.isPending(
        info.id,
        input.requester_id,
      );

      if (amISending) {
        permission.cancel_request_friend = true;
      } else if (amIReceiving) {
        permission.accept_request_friend = true;
      } else {
        permission.add_friend = true;
      }
    } else {
      permission.unfriend = true;
    }

    return { ...info, is_friend, permission };
  }


  private async getOtherInfo(input: {
    requester_id: string;
    condition: { id?: string; username?: string };
  }) {
    const { requester_id, condition } = input;

    const selectArray = [
      'u.id AS id',
      'u.nickname AS nickname',
      'u.user_name AS user_name',
      'u.bio AS bio',
      'u.avatar_url AS avatar_url',
    ]

    const qb = this.userRepository
      .createQueryBuilder('u')
      .leftJoin(
        'friendship',
        'f',
        'f.user_id = :requester_id AND f.friend_id = u.id AND f.deleted_at IS NULL',
        { requester_id },
      ).select(selectArray)
      .addSelect(
        'CASE WHEN f.id IS NOT NULL THEN true ELSE false END',
        'is_friend',
      );

    if (condition.id) qb.where('u.id = :id', { id: condition.id });
    if (condition.username)
      qb.where('u.user_name = :username', { username: condition.username });

    const user = await qb.getRawOne();
    if (!user) throw new NotFoundException({ errorCode: 'user_not_found' });

    const isFriend = user.is_friend === 'true';
    const label = isFriend ? 'friend' : 'not_friend';
    const output = this.filterByLabels.filterDataOfQueryResult({
      object: user,
      label,
    });

    return { info: output, is_friend: isFriend };
  }

  async getMyInfo(user_id: string) {
    const role = 'me';
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: role,
    });

    const user = await this.userRepository.findOne({
      where: { id: user_id },
      relations ,
      select,
    });
    if (!user) return new NotFoundException({ error: 'user_not_found' });
    return user;
  }

  // ----------------- Create -----------------

  @Transactional()
  async create(body: CreateUserDto) {
    const label = 'me';
    body.password = await projectBcrypt.encode(body.password);
    const user = await this.userRepository.save(body);

    return {
      info: this.filterByLabels.filterDataOfQueryResult({
        object: user,
        label,
      }),
    };
  }

  // ----------------- Update -----------------

  async updateInfo(input: { user_id: string; body: UpdateUserDto }) {
    const { user_id, body } = input;

    if (body.password)
      body.password = await projectBcrypt.encode(body.password);
    const result = await this.userRepository.update({ id: user_id }, body);
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'update_setting_failed' });
    return this.getMyInfo(user_id);
  }

  // ================= Password ( ) =================

  async getAuthInfoById(user_id: string) {
    return await this.userRepository.findOne({
      where: { id: user_id },
      select: { id: true, email: true, status: true },
    });
  }

  async setPassword(input: { user_id: string; password_hash: string }) {
    const result = await this.userRepository.update(
      { id: input.user_id },
      { password: input.password_hash },
    );

    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'user_not_found' });
    return true;
  }

  // ================= Google (GIS) =================

  /**
   * Đăng nhập / đăng ký bằng Google — dùng CHUNG cho cả 2 nút ở FE:
   *
   *  1. đã có `google_id`               → trả user (đăng nhập)
   *  2. đã có tài khoản cùng `email`    → liên kết `google_id` rồi trả user (đăng nhập)
   *  3. chưa có gì                      → tạo tài khoản mới (đăng ký)
   *
   * ⇒ Bấm "Đăng ký" bằng tài khoản Google đã tồn tại sẽ KHÔNG bị lỗi trùng,
   *   mà chạy đúng luồng đăng nhập.
   */
  async findOrCreateGoogleUser(input: {
    google_id: string;
    email: string;
    nickname?: string;
    avatar_url?: string;
  }) {
    const { google_id, email, nickname, avatar_url } = input;

    // 1. tài khoản Google đã từng đăng nhập
    const byGoogleId = await this.userRepository.findOne({
      where: { google_id },
    });
    if (byGoogleId) return byGoogleId;

    // 2. có tài khoản email/mật khẩu cùng email -> liên kết Google vào luôn
    const byEmail = await this.userRepository.findOne({ where: { email } });
    if (byEmail) {
      await this.userRepository.update(
        { id: byEmail.id },
        { google_id, updated_by: byEmail.id },
      );
      byEmail.google_id = google_id;
      return byEmail;
    }

    // 3. tạo tài khoản mới (không có password -> chỉ đăng nhập được bằng Google)
    const fallbackNickname = nickname?.trim() || email.split('@')[0] || 'user';

    return await this.userRepository.save({
      google_id,
      email,
      user_name: await this.generateUniqueUserName(email),
      nickname: fallbackNickname.slice(0, 50),
      avatar_url: avatar_url ?? null,
    });
  }

  /** user_name phải là [a-zA-Z0-9]+ và duy nhất → sinh từ phần trước @ của email */
  private async generateUniqueUserName(email: string) {
    const base =
      email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 45) || 'user';

    let candidate = base;

    for (let i = 1; i <= 20; i++) {
      const taken = await this.userRepository.exists({
        where: { user_name: candidate },
      });
      if (!taken) return candidate;

      const tail = String(i);
      candidate = `${base.slice(0, 50 - tail.length)}${tail}`;
    }

    // cực hiếm mới tới đây — thêm hậu tố ngẫu nhiên cho chắc
    return `user${randomInt(100000, 1000000)}`;
  }

  // =======================================================
  //                       ADMIN
  // =======================================================

  adminGetOne(user_id: string) {
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });
    return this.userRepository.findOne({
      where: { id: user_id },
      relations ,
      select,
    });
  }

  /**
   * Danh sách người dùng cho admin, có lọc.
   *
   * Mọi filter đều tùy chọn; bỏ trống thì TypeORM tự bỏ qua (giá trị undefined).
   * `with_deleted` bật thì trả cả bản ghi đã xoá mềm kèm cờ `is_deleted`.
   */
  async adminFindMany(query: AdminUserQueryDto) {
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.userRepository.findAndCount({
      where: adminWhere({
        id: adminUuidLike(query.id),
        user_name: adminLike(query.user_name),
        email: adminLike(query.email),
        nickname: adminLike(query.nickname),
        role: query.role,
        status: query.status,
        created_at: adminCreatedRange(query),
      }),
      relations,
      select,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      withDeleted: query.with_deleted === true,
    });

    return adminPage({ items: items.map(markDeleted), total, page, limit });
  }

  /** Khôi phục một người dùng đã bị xoá mềm */
  async adminRestore(user_id: string) {
    const result = await this.userRepository.restore({ id: user_id });

    if (!result.affected)
      throw new NotFoundException({
        errorCode: 'user_not_found_or_not_deleted',
      });

    return this.adminGetOne(user_id);
  }

  async adminUpdateInfo(input: {
    user_id: string;
    body: AdminUpdateUserDto;
    admin_id?: string;
  }) {
    const { user_id, body, admin_id } = input;

    if (body.password)
      body.password = await projectBcrypt.encode(body.password);

    const patch: Record<string, any> = { ...body };

    if (body.status) {
      patch.status_changed_at = new Date();
      if (admin_id) patch.status_changed_by = admin_id;
    }

    const result = await this.userRepository.update({ id: user_id }, patch);
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'user_not_found' });

    return this.adminGetOne(user_id);
  }
}









