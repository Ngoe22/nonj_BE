import {Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Post, Query} from "@nestjs/common";
import {ReportService} from "../report.service.js";
import {CreateReportDto} from "../dto/report.dto.js";
import {GetRequesterInfo} from "../../_common/decorators/param/request_payload.decorator.js";
import type {RequesterInfo} from "../../_common/types/request.js";
import {ParseLimitPipe} from "../../_common/pipe/ParseLimitPipe.js";

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  create(@Body() body: CreateReportDto, @GetRequesterInfo() requester: RequesterInfo) {
    return this.reportService.create({ requester_id: requester.id, body });
  }

  @Get('me')
  getManyMine(
      @GetRequesterInfo() requester: RequesterInfo,
      @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
      @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
  ) {
    return this.reportService.findManyMine({ requester_id: requester.id, page, limit });
  }
  @Delete(':report_id')
  delete(
      @GetRequesterInfo() requester: RequesterInfo ,
      @Param('report_id') report_id: string, // report_id là UUID, KHÔNG phải số -> bỏ ParseIntPipe
  ) {

    return this.reportService.hardDeleteMyReport( { user_id : requester.id , report_id } )
  }
}