import { Module } from '@nestjs/common';
import { ReportService } from './report.service.js';
import { ReportController } from './controller/report.controller.js';
import { AdminReportController } from './controller/admin-report.controller.js';
import {Report} from "./entities/report.entity.js";
import {TypeOrmModule} from "@nestjs/typeorm";

import { UserNotifModule } from '../user_notif/user_notif.module.js';
@Module({
  imports: [
    UserNotifModule,TypeOrmModule.forFeature([Report])] ,
  controllers: [ReportController, AdminReportController],
  providers: [ReportService],
})
export class ReportModule {}
