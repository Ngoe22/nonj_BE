import {Injectable, NotFoundException, Post} from "@nestjs/common";
import {CreateReportDto, ReviewReportDto} from "./dto/report.dto.js";
import {Report_Status, Target_Type} from "./enum/report.enum.js";
import {DataSource, Repository} from "typeorm";
import {User} from "../user/entities/user.entity.js";
import {Group} from "../group/entities/group.entity.js";
import {FilterDbField} from "../_common/helper/filterQueryForRole.js";
import {Report} from "./entities/report.entity.js";
import {InjectDataSource, InjectRepository} from "@nestjs/typeorm";
import {PostAnswer} from "../post_answer/entities/post_answer.entity.js";


@Injectable()
export class ReportService {
  private filterByRoles: FilterDbField<Report>;
  private dataSource: any;

  constructor(
      @InjectRepository(Report)
      private readonly reportRepo: Repository<Report>,

  ) {
    this.filterByRoles = new FilterDbField({
      keyAndLabels: {
        id: ['me', 'admin'],
        user_report: ['me', 'admin'],
        target_type: ['me', 'admin'],
        target_id: ['me', 'admin'],
        reason: ['me', 'admin'],
        description: ['me', 'admin'],
        status: ['me', 'admin'],
        action_taken: ['admin'],
        review_by: ['admin'],
        reviewed_at: ['admin'],
        review_note: ['admin'],
      },
      dataBase: Report,
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

    return this.filterByRoles.filterDataOfQueryResult({ object: report, label: 'me' });
  }

  // ==================== Read - own reports ====================

  async findManyMine(input: { requester_id: string; page: number; limit: number }) {
    const { requester_id, page, limit } = input;

    const select = this.filterByRoles.buildQuerySelectObject({ label: 'me' });

    return this.reportRepo.find({
      where: { user_report: { id: requester_id } },
      select,
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

  async adminFindMany(input: {
    status?: Report_Status;
    target_type?: Target_Type;
    page: number;
    limit: number;
  }) {
    const { status, target_type, page, limit } = input;

    const select = this.filterByRoles.buildQuerySelectObject({ label: 'admin' });

    const where: any = {};
    if (status) where.status = status;
    if (target_type) where.target_type = target_type;

    return this.reportRepo.find({
      where,
      select,
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' },
    });
  }

  async adminFindOne(input: { report_id: string }) {
    const select = this.filterByRoles.buildQuerySelectObject({ label: 'admin' });

    const report = await this.reportRepo.findOne({
      where: { id: input.report_id },
      select,
    });

    if (!report) throw new NotFoundException({ errorCode: 'report_not_found' });
    return report;
  }

  async adminReview(input: { report_id: string; admin_id: string; body: ReviewReportDto }) {
    const { report_id, admin_id, body } = input;

    const result = await this.reportRepo.update(
        { id: report_id },
        {
          ...body ,
          review_by: { id: admin_id },
          reviewed_at: new Date(),
        },
    );

    if (result.affected === 0) throw new NotFoundException({ errorCode: 'report_not_found' });
    return true;
  }

  // ==================== Helper ====================


}