import {Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Query, UseGuards} from "@nestjs/common";
import {UserGuard} from "../../_other_module/guards/user.guard.js";
import {User_Role} from "../../user/enums/user.enum.js";
import {ReportService} from "../report.service.js";
import {Report_Status, Target_Type} from "../enum/report.enum.js";
import {ParseLimitPipe} from "../../_common/pipe/ParseLimitPipe.js";
import {ReviewReportDto} from "../dto/report.dto.js";
import {GetRequesterInfo} from "../../_common/decorators/param/request_payload.decorator.js";
import type {RequesterInfo} from "../../_common/types/request.js";


// ===============================================


@Controller('admin/report')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminReportController {
    constructor(private readonly reportService: ReportService) {}

    @Get()
    getMany(
        @Query('status') status: Report_Status,
        @Query('target_type') target_type: Target_Type,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
    ) {
        return this.reportService.adminFindMany({ status, target_type, page, limit });
    }

    @Get(':report_id')
    getOne(@Param('report_id') report_id: string) {
        return this.reportService.adminFindOne({ report_id });
    }

    @Patch(':report_id/review')
    review(
        @Param('report_id') report_id: string,
        @Body() body: ReviewReportDto,
        @GetRequesterInfo() requester: RequesterInfo,
    ) {
        return this.reportService.adminReview({ report_id, admin_id: requester.id, body });
    }
}