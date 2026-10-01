import {Injectable, NotFoundException, Post} from "@nestjs/common";
import {CreateReportDto, ReviewReportDto} from "./dto/report.dto.js";
import {Report_Status, Target_Type} from "./enum/report.enum.js";
import {DataSource, Repository} from "typeorm";
import {User} from "../user/entities/user.entity.js";
import {Group} from "../group/entities/group.entity.js";
import {FilterDbField} from "../_common/helper/filterQueryForRole.js";
import {AdminReportQueryDto} from "./dto/admin-report-query.dto.js";
import {
  adminCreatedRange,
  adminLike,
  adminPage,
  adminUuidLike,
  markDeleted,
  adminWhere,
} from "../_common/helper/admin_query.helper.js";
import {Report} from "./entities/report.entity.js";
import {InjectDataSource, InjectRepository} from "@nestjs/typeorm";
import {PostAnswer} from "../post_answer/entities/post_answer.entity.js";


import { UserNotifService } from '../user_notif/user_notif.service.js';
import { User_Notif_Type } from '../user_notif/enum/user_notif.enum.js';
@Injectable()
export class ReportService {
  private filterByLabels: FilterDbField<Report | User, string>;

  constructor(
      @InjectDataSource()
      private readonly dataSource: DataSource,
      @InjectRepository(Report)
      private readonly reportRepo: Repository<Report>,

      private readonly notifService: UserNotifService,
  ) {
    this.filterByLabels =  FilterDbField.create({
      labels : [ 'SA' , 'me' ] ,
      fieldAndLabels: {
        id: [ 'SA', 'me'],
        user_report: {
          id : [ 'SA' ] ,
          user_name : [ 'SA' ] ,
          nickname : [ 'SA' ] ,
        },
        target_type: [ 'SA', 'me'],
        target_id: [ 'SA', 'me'],
        reason: [ 'SA', 'me'],
        description: [ 'SA', 'me'],
        status: [ 'SA', 'me'],
        action_taken: ['SA', 'me'],
        review_by:{
          id : [ 'SA' ] ,
          user_name : [ 'SA' ] ,
          nickname : [ 'SA' ] ,
        },
        reviewed_at: ['SA', 'me'],
        review_note: ['SA'],
        // admin cần thấy mốc tạo/cập nhật + trạng thái xoá mềm
        created_at: ['SA', 'me'],
        updated_at: ['SA'],
        deleted_at: ['SA'],
      },
      dataBases: {
        _main : Report ,
        user_report : User ,
        review_by : User ,
      },
      dataSource : this.dataSource

    });
  }

  // ==================== Check ====================

  private async isTargetExist(input: { target_type: Target_Type; target_id: string }) {
    const { target_type, target_id } = input;

    const repoMap: Record<Target_Type, () => Repository<any>> = {
      [Target_Type.POST]: () => this.dataSource.getRepository(Post),
      [Target_Type.USER]: () => this.dataSource.getRepository(User),
      [Target_Type.GROUP]: () => this.dataSource.getRepository(Group),
      [Target_Type.POST_ANSWER]: () => this.dataSource.getRepository(PostAnswer),
    };

    const getRepo = repoMap[target_type];
    if (!getRepo) throw new NotFoundException({ errorCode: 'unsupported_target_type' });

    const exists = await getRepo().exists({ where: { id: target_id } });
    if (!exists) throw new NotFoundException({ errorCode: 'target_not_found' });
  }

  // ==================== Create ====================

  async create(input: { requester_id: string; body: CreateReportDto }) {
    const { requester_id, body } = input;

    await this.isTargetExist({ target_type: body.target_type, target_id: body.target_id });

    const report = await this.reportRepo.save({
      user_report: { id: requester_id },
      ...body ,
    });

    return this.filterByLabels.filterDataOfQueryResult({ object: report, label: 'me' });
  }

  // ==================== Read - own reports ====================

  async findManyMine(input: { requester_id: string; page: number; limit: number }) {
    const { requester_id, page, limit } = input;

    const { select ,relations } = this.filterByLabels.buildQueryObject({ label: 'me' });

    return this.reportRepo.find({
      where: { user_report: { id: requester_id } },
      select ,relations,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }


  async  hardDeleteMyReport (input: { report_id: string; user_id: string }) {
    const { report_id, user_id } = input;
    const result = await this.reportRepo.delete({
      id: report_id,
      user_report: { id: user_id },
      status: Report_Status.PENDING,
    });
    if (result.affected === 0) {
      throw new NotFoundException({ errorCode: 'report_not_found_or_not_pending' });
    }
    return true;
  }

  // ==========================================================================
  //                                 ADMIN
  // ==========================================================================

  /** Danh sách báo cáo cho admin, có lọc + phân trang */
  async adminFindMany(query: AdminReportQueryDto) {
    const { select, relations } = this.filterByLabels.buildQueryObject({
      label: 'SA',
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.reportRepo.findAndCount({
      where: adminWhere({
        id: adminUuidLike(query.id),
        status: query.status,
        target_type: query.target_type,
        user_report: { user_name: adminLike(query.user_name) },
        created_at: adminCreatedRange(query),
      }),
      select,
      relations,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
      withDeleted: query.with_deleted === true,
    });

    return adminPage({ items: items.map(markDeleted), total, page, limit });
  }

  /** Xoá mềm một báo cáo */
  async adminSoftDelete(input: { report_id: string; admin_id: string }) {
    const result = await this.reportRepo.update(
      { id: input.report_id },
      { deleted_at: new Date(), deleted_by: input.admin_id },
    );

    if (!result.affected)
      throw new NotFoundException({ errorCode: 'report_not_found' });

    return true;
  }

  /** Khôi phục một báo cáo đã bị xoá mềm */
  async adminRestore(report_id: string) {
    const result = await this.reportRepo.restore({ id: report_id });

    if (!result.affected)
      throw new NotFoundException({
        errorCode: 'report_not_found_or_not_deleted',
      });

    return this.adminFindOne({ report_id });
  }

  async adminFindOne(input: { report_id: string }) {
    const {select ,relations} = this.filterByLabels.buildQueryObject({ label: 'SA' });

    const report = await this.reportRepo.findOne({
      where: { id: input.report_id },
      select ,relations,
    });

    if (!report) throw new NotFoundException({ errorCode: 'report_not_found' });
    return report;
  }

  async adminReview(input: { report_id: string; admin_id: string; body: ReviewReportDto }) {
    const { report_id, admin_id, body } = input;

    const existing = await this.reportRepo.findOne({
      where: { id: report_id },
      relations: { user_report: true },
      select: {
        id: true,
        target_type: true,
        target_id: true,
        user_report: { id: true },
      },
    });
    if (!existing)
      throw new NotFoundException({ errorCode: 'report_not_found' });

    const result = await this.reportRepo.update(
        { id: report_id },
        {
          ...body ,
          review_by: { id: admin_id },
          reviewed_at: new Date(),
        },
    );

    if (result.affected === 0) throw new NotFoundException({ errorCode: 'report_not_found' });

    const reporterId = existing.user_report?.id;
    if (reporterId) {
      await this.notifService
        .send({
          user_id: reporterId,
          type: User_Notif_Type.REPORT_RESOLVED,
          content: {
            report_id,
            status: body.status ?? null,
            action_taken: body.action_taken ?? null,
            target_type: existing.target_type,
            target_id: existing.target_id,
          },
        })
        .catch(() => undefined);
    }

    return true;
  }

  // ==================== Helper ====================


}