import { Module } from '@nestjs/common';
import { ReportService } from './report.service.js';
import { ReportController } from './report.controller.js';
import {Report} from "./entities/report.entity.js";
import {TypeOrmModule} from "@nestjs/typeorm";

@Module({
  imports: [TypeOrmModule.forFeature([Report])] ,
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
