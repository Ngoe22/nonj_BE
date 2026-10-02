import {Group} from '../../entities/group.entity.js';
import {InjectDataSource, InjectRepository} from '@nestjs/typeorm';
import {DataSource, IsNull, Repository} from 'typeorm';
import {GroupMemberService} from '../group_member/group_member.service.js';
import {FilterDbField} from '../../../_common/helper/filterQueryForRole.js';
import {CreateGroupDto, UpdateGroupDto} from '../../dto/group.dto.js';
import { AdminGroupQueryDto } from '../../dto/admin-group-query.dto.js';
import {
  adminCreatedRange,
  adminLike,
  adminPage,
  adminUuidLike,
  markDeleted,
  adminWhere,
} from '../../../_common/helper/admin_query.helper.js';
import {Transactional} from 'typeorm-transactional';
import {Injectable, NotFoundException} from '@nestjs/common';
import {User} from "../../../user/entities/user.entity.js";
import {GroupMember} from "../../entities/group_member.entity.js";
import {Group_Join_Request_Status} from "../../enum/group.enum.js";
import {map} from "rxjs/operators";

//====================================================================

@Injectable()
export class GroupService {
  private filterByLabels: FilterDbField<Group | User, string>;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    private readonly groupMemberService: GroupMemberService,
  ) {
    this.filterByLabels = FilterDbField.create({
      labels: ['SA', 'founder', 'admin', 'member', 'unjoin', 'setting'],
      fieldAndLabels: {
        id: ['SA', 'member', 'unjoin', 'admin', 'founder', 'setting'],
        founder: {
          id: ['SA'],
          nickname: ['SA'],
          user_name: ['SA'],
          avatar_url: [],
        },
        slug: ['SA', 'member', 'unjoin', 'admin', 'founder'],
        name: ['SA', 'member', 'unjoin', 'admin', 'founder'],
        description: ['SA', 'member', 'unjoin', 'admin', 'founder'],
        join_mode: ['SA', 'member', 'unjoin', 'admin', 'founder', 'setting'],
        view_mode: ['SA', 'member', 'unjoin', 'admin', 'founder', 'setting'],
        created_at: ['SA', 'member', 'admin', 'founder', 'member'],
        // admin cần thấy trạng thái + mốc cập nhật/xoá mềm
        updated_at: ['SA'],
        deleted_at: ['SA'],
        group_member: {
          role: ['member', 'admin', 'founder'],
        },
      },
      dataBases: {
        _main: Group,
        founder: User,
        group_member: GroupMember,
      },
      dataSource: this.dataSource,
      FE_permission: {
        view_setting: ['founder'],
        view_join_req: ['founder'],
        view_member: ['founder', 'admin'],
        edit_setting: ['founder'],
        able_to_leave: ['member', 'admin'],
        able_to_delete: ['founder'],
        create_collection: ['founder'],
        // giao bài trong nhóm: cả trưởng nhóm lẫn phó nhóm
        create_post: ['founder', 'admin'],
        // Người NGOÀI nhóm được gán label 'unjoin' -> false.
        // FE dùng cờ này để hiện dải "tham gia nhóm để làm bài tập" thay vì
        // để người dùng bấm vào rồi nhận lỗi khó hiểu.
        is_member: ['founder', 'admin', 'member'],
      },
    });
  }

  // private

  private async findOne(
    where: any,
    label: 'founder' | 'admin' | 'member' | 'unjoin',
  ) {
    const { relations, select } = this.filterByLabels.buildQueryObject({
      label,
    });
    const group = await this.groupRepo.findOne({
      where,
      relations,
      select,
    });
    if (!group) throw new NotFoundException({ errorCode: 'group_not_found' });
    return this.filterByLabels.filterDataOfQueryResult({
      object: group,
      label,
    });
  }

  private async findMany(input: {
    where: any;
    label: 'founder' | 'admin' | 'member' | 'unjoin';
    limit: number;
    page: number;
  }) {
    const { where, label, limit, page } = input;
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label,
    });

    return await this.groupRepo.find({
      where,
      relations,
      select,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  // ==================== Helper ====================

  async getSetting(group_id: string) {
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'setting',
    });

    const result = await this.groupRepo.findOne({
      where: { id: group_id },
      relations,
      select,
    });

    if (!result) throw new NotFoundException({ errorCode: 'group_not_found' });
    return result;
  }

  // ==================== Create ====================

  @Transactional()
  async create(input: { founder_id: string; body: CreateGroupDto }) {
    const { founder_id, body } = input;

    const group = await this.groupRepo.save({
      ...body,
      founder: { id: founder_id },
    });

    await this.groupMemberService.addFounder({
      group_id: group.id,
      user_id: founder_id,
    });

    return {
      ...this.filterByLabels.filterDataOfQueryResult({
        object: group,
        label: 'founder',
      }),
      // trả kèm permission như GET /group/id_search để FE dùng được ngay (khỏi refetch)
      permission: this.filterByLabels.getLabelPermission('founder'),
    };
  }

  // ==================== Read - One ====================


  async getOneById(input: { group_id: string; requester_id: string }) {
    const { group_id, requester_id } = input;

    const selectArray = [
      'g.id AS id', // ⬅️ đổi g_id → id
      'g.name AS name', // ⬅️ đổi g_name → name
      'g.slug AS slug',
      'g.description AS description',
      'g.join_mode AS join_mode',
      'g.view_mode AS view_mode',
      'g.created_at AS created_at', // FE Group.created_at
    ];

    // EXISTS thay LEFT JOIN: tránh nhân dòng khi có nhiều bản ghi thành viên,
    // và BỔ SUNG `has_pending_request` để FE biết người dùng đã gửi yêu cầu
    // tham gia rồi (nếu không, banner "cần tham gia nhóm" cứ hiện lại và người
    // dùng bấm Join liên tục).
    const result = await this.groupRepo
      .createQueryBuilder('g')
      .select(selectArray)
      .addSelect(
        `EXISTS (
           SELECT 1 FROM group_member gm
           WHERE gm.group_id = g.id
             AND gm.user_id = :requester_id
             AND gm.deleted_at IS NULL
         )`,
        'is_joined',
      )
      .addSelect(
        `(SELECT gm2.role FROM group_member gm2
           WHERE gm2.group_id = g.id
             AND gm2.user_id = :requester_id
             AND gm2.deleted_at IS NULL
           ORDER BY gm2.created_at DESC
           LIMIT 1)`,
        'role',
      )
      .addSelect(
        `EXISTS (
           SELECT 1 FROM group_join_request jr
           WHERE jr.group_id = g.id
             AND jr.sender_id = :requester_id
             AND jr.status = :pending
         )`,
        'has_pending_request',
      )
      .where('g.id = :group_id', { group_id })
      .andWhere('g.deleted_at IS NULL')
      .setParameters({
        requester_id,
        pending: Group_Join_Request_Status.PENDING,
      })
      .getRawOne();

    if (!result) throw new NotFoundException({ errorCode: 'group_not_found' });

    const role = (result.role ?? 'unjoin').toLowerCase();
    const permission = this.filterByLabels.getLabelPermission(role);
    const final_group = this.filterByLabels.filterDataOfQueryResult({
      object: result,
      label: role,
    });
    return {
      ...final_group,
      id: result.id,
      is_joined: result.is_joined === true || result.is_joined === 'true',
      has_pending_request:
        result.has_pending_request === true ||
        result.has_pending_request === 'true',
      permission,
    };
  }

  // ==================== Search ====================

  async searchOneBySlug(input: { slug: string; requester_id: string }) {
    const { slug, requester_id } = input;

    const selectArray = [
      'g.id AS id', // ⬅️ FE SearchGroup.id (trước đây là g_id)
      'g.name AS name', // ⬅️ FE SearchGroup.name (trước đây là g_name)
      'g.slug AS slug',
      'g.description AS description',
      'g.join_mode AS join_mode',
      'g.view_mode AS view_mode',
    ];

    const result = await this.groupRepo
        .createQueryBuilder('g')
        .leftJoin(
            'g.group_member',
            'gm',
            'gm.user_id = :requester_id AND gm.deleted_at IS NULL',
            { requester_id },
        )
        .leftJoin(
            'group_join_request', 'jr',
            'jr.group_id = g.id AND jr.sender_id = :requester_id AND jr.status = :pending',
            { requester_id, pending: Group_Join_Request_Status.PENDING },
        )
        .select(selectArray)
        .addSelect('CASE WHEN gm.id IS NOT NULL THEN true ELSE false END', 'is_joined')
        .addSelect('CASE WHEN jr.id IS NOT NULL THEN true ELSE false END', 'has_pending_request')
        .addSelect('gm.role', 'role')
        .where('g.slug = :slug', { slug })
        .andWhere('g.deleted_at IS NULL')
        .getRawOne();

    if (!result) throw new NotFoundException({ errorCode: 'group_not_found' });

    const role = (result.role ?? 'unjoin').toLowerCase();
    const final_group = this.filterByLabels.filterDataOfQueryResult({
      object: result,
      label: role,
    });

    return {
      ...final_group,
      id: result.id,
      is_joined: result.is_joined === true || result.is_joined === 'true',
      has_pending_request: result.has_pending_request === true || result.has_pending_request === 'true',
      // object boolean đầy đủ (mọi key) — FE không phải check undefined
      permission: this.filterByLabels.getLabelPermission(role),
    };
  }




  //  Pending for optimize
  async searchManyByName(input: {
    name: string;
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { name, requester_id, page, limit } = input;

    const selectArray = [
      'g.id AS id',
      'g.name AS name',
      'g.slug AS slug',
      'g.description AS description',
      'g.join_mode AS join_mode',
      'g.view_mode AS view_mode',
    ];

    // Dùng EXISTS + subquery thay cho LEFT JOIN.
    //
    // LEFT JOIN vào `group_member` / `group_join_request` sẽ nhân dòng: một nhóm
    // có N yêu cầu đang chờ thì hiện ra N lần trong kết quả tìm kiếm. EXISTS chỉ
    // trả true/false nên mỗi nhóm luôn đúng MỘT dòng.
    const results = await this.groupRepo
        .createQueryBuilder('g')
        .select(selectArray)
        .addSelect(
            `EXISTS (
               SELECT 1 FROM group_member gm
               WHERE gm.group_id = g.id
                 AND gm.user_id = :requester_id
                 AND gm.deleted_at IS NULL
             )`,
            'is_joined',
        )
        .addSelect(
            `EXISTS (
               SELECT 1 FROM group_join_request jr
               WHERE jr.group_id = g.id
                 AND jr.sender_id = :requester_id
                 AND jr.status = :pending
             )`,
            'has_pending_request',
        )
        .addSelect(
            `(SELECT gm2.role FROM group_member gm2
               WHERE gm2.group_id = g.id
                 AND gm2.user_id = :requester_id
                 AND gm2.deleted_at IS NULL
               ORDER BY gm2.created_at DESC
               LIMIT 1)`,
            'role',
        )
        .where('g.name ILIKE :name', { name: `%${name}%` })
        .andWhere('g.deleted_at IS NULL')
        .setParameters({
          requester_id,
          pending: Group_Join_Request_Status.PENDING,
        })
        .orderBy('g.created_at', 'DESC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany();

    return results.map((item) => {
      const role = (item.role ?? 'unjoin').toLowerCase();
      const permission = this.filterByLabels.getLabelPermission(role);
      const final_group = this.filterByLabels.filterDataOfQueryResult({ object: item, label: role });

      return {
        ...final_group,
        id: item.id,
        is_joined: item.is_joined === true || item.is_joined === 'true',
        has_pending_request: item.has_pending_request === true || item.has_pending_request === 'true',
        permission,
      };
    });
  }

  // personal

  async findMyOwnMany(input: {
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { requester_id, page, limit } = input;

    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'founder',
    });
    const result = await this.groupRepo.find({
      where: { founder: { id: requester_id } },
      relations,
      select,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });

    const permission = this.filterByLabels.getLabelPermission('founder');
    return result.map((group) => {
      return { ...group, permission };
    });
  }

  async findManyJoined(input: {
    requester_id: string;
    page: number;
    limit: number;
  }) {
    const { requester_id, page, limit } = input;

    const qb = this.groupRepo
      .createQueryBuilder('g')
      .innerJoin(
        'g.group_member',
        'gm',
        'gm.user_id = :requester_id AND gm.deleted_at IS NULL',
        { requester_id },
      )
      .select([
        'g.id AS id',
        'g.name AS name',
        'g.slug AS slug',
        'g.description AS description',
        'g.join_mode AS join_mode',
        'g.view_mode AS view_mode',
        'g.created_at AS created_at',
        'gm.role AS role',
      ])
      .where('g.deleted_at IS NULL')
      .orderBy('g.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const rows = await qb.getRawMany();

    return rows.map((row) => {
      const role = (row.role ?? 'unjoin').toLowerCase();
      const permission = this.filterByLabels.getLabelPermission(role);
      const final_group = this.filterByLabels.filterDataOfQueryResult({
        object: row,
        label: role,
      });
      return { ...final_group, permission };
    });
  }

  // ==================== Update ====================

  async update(input: {
    group_id: string;
    founder_id: string;
    body: UpdateGroupDto;
  }) {
    const { group_id, founder_id, body } = input;

    const result = await this.groupRepo.update(
      { id: group_id, founder: { id: founder_id } },
      { ...body, updated_by: founder_id },
    );

    if (result.affected === 0) {
      throw new NotFoundException({ errorCode: 'group_or_founder_not_found' });
    }
    // trả group đã update (kèm permission) thay vì `true` để FE cache đúng ngay
    return this.getOneById({ group_id, requester_id: founder_id });
  }

  // ==================== Delete ====================

  async softDelete(input: { group_id: string; founder_id: string }) {
    const { group_id, founder_id } = input;

    const result = await this.groupRepo.update(
      { id: group_id, founder: { id: founder_id } },
      { deleted_at: new Date(), deleted_by: founder_id },
    );

    if (result.affected === 0) {
      throw new NotFoundException({ errorCode: 'group_or_founder_not_found' });
    }
    return true;
  }

  //   =========================================================================
  //                            ADMIN
  //   =========================================================================

  async adminFindById(group_id: string) {
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    return this.groupRepo.findOne({
      where: { id: group_id },
      relations,
      select,
    });
  }

  /**
   * Danh sách nhóm cho admin, có lọc + kèm TỔNG SỐ THÀNH VIÊN.
   *
   * Số thành viên đếm riêng bằng 1 query gộp theo `group_id` (chỉ đếm bản ghi
   * chưa xoá mềm) rồi ghép vào kết quả — rẻ hơn nhiều so với đếm từng nhóm.
   */
  async adminFindMany(query: AdminGroupQueryDto) {
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.groupRepo.findAndCount({
      where: adminWhere({
        id: adminUuidLike(query.id),
        slug: adminLike(query.slug),
        name: adminLike(query.name),
        founder: { user_name: adminLike(query.founder_user_name) },
        join_mode: query.join_mode,
        view_mode: query.view_mode,
        created_at: adminCreatedRange(query),
      }),
      relations,
      select,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      withDeleted: query.with_deleted === true,
    });

    const memberCount = await this.countMembers(items.map((item) => item.id));

    return adminPage({
      items: items.map((item) => ({
        ...markDeleted(item),
        total_member: memberCount.get(item.id) ?? 0,
      })),
      total,
      page,
      limit,
    });
  }

  /** Đếm số thành viên còn hiệu lực của từng nhóm */
  private async countMembers(groupIds: string[]): Promise<Map<string, number>> {
    if (groupIds.length === 0) return new Map();

    const rows = await this.groupRepo.manager
      .createQueryBuilder(GroupMember, 'gm')
      .select('gm.group_id', 'group_id')
      .addSelect('COUNT(*)::int', 'total')
      .where('gm.group_id IN (:...groupIds)', { groupIds })
      .andWhere('gm.deleted_at IS NULL')
      .groupBy('gm.group_id')
      .getRawMany<{ group_id: string; total: number }>();

    return new Map(rows.map((row) => [row.group_id, Number(row.total)]));
  }

  /** Khôi phục một nhóm đã bị xoá mềm */
  /** slug có bị ai dùng chưa — dùng cho nút Check ở form tạo/sửa nhóm */
  async checkSlugExist(slug: string) {
    return this.groupRepo.exists({ where: { slug } });
  }

  async adminRestore(group_id: string) {
    const result = await this.groupRepo.restore({ id: group_id });

    if (!result.affected)
      throw new NotFoundException({
        errorCode: 'group_not_found_or_not_deleted',
      });

    return this.adminFindById(group_id);
  }

  async adminUpdate(input: {
    group_id: string;
    body: UpdateGroupDto;
    sysadmin_id: string;
  }) {
    const result = await this.groupRepo.update(
      { id: input.group_id },
      { ...input.body, updated_by: input.sysadmin_id },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'group_not_found' });
    return true;
  }

  async adminSoftDelete(input: { group_id: string; sysadmin_id: string }) {
    const { group_id, sysadmin_id } = input;
    const result = await this.groupRepo.update(
      { id: group_id },
      { deleted_at: new Date(), deleted_by: sysadmin_id },
    );
    if (result.affected === 0)
      throw new NotFoundException({ errorCode: 'group_not_found' });
    return true;
  }
}


//////// =================================
// broken code
// const selectArray = this.filterByLabels.buildQuerySelectArray({
//   label: 'unjoin',
//   tableName: 'g',
// });
//
// return this.groupRepo
//   .createQueryBuilder('g')
//   .leftJoin(
//     'g.group_member',
//     'gm',
//     'gm.user_id = :requester_id AND gm.deleted_at IS NULL',
//     { requester_id },
//   )
//   .select(selectArray)
//   .addSelect(
//     'CASE WHEN gm.id IS NOT NULL THEN true ELSE false END',
//     'is_joined',
//   )
//   .where('g.name ILIKE :name', { name: `%${name}%` })
//   .andWhere('g.deleted_at IS NULL')
//   .skip((page - 1) * limit)
//   .take(limit)
//   .getRawMany();
// if false return []

// async searchOneBySlug(input: { slug: string; requester_id: string }) {
//   const { slug, requester_id } = input;
//
//   const selectArray = [
//     'g.id AS g_id',
//     'g.name AS g_name',
//     'g.slug AS slug',
//     'g.description AS description',
//     'g.join_mode AS join_mode',
//     'g.view_mode AS view_mode',
//   ];
//
//   const result = await this.groupRepo
//     .createQueryBuilder('g')
//     .leftJoin(
//       'g.group_member',
//       'gm',
//       'gm.user_id = :requester_id AND gm.deleted_at IS NULL',
//       { requester_id },
//     )
//     .select(selectArray)
//     .addSelect(
//       'CASE WHEN gm.id IS NOT NULL THEN true ELSE false END',
//       'is_joined',
//     )
//     .addSelect('gm.role', 'role')
//     .where('g.slug = :slug', { slug })
//     .andWhere('g.deleted_at IS NULL')
//     .getRawOne();
//
//   if (!result) throw new NotFoundException({ errorCode: 'group_not_found' });
//   return result;
// }