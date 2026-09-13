import {Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Query, UseGuards} from "@nestjs/common";
import {UserGuard} from "../../_other_module/guards/user.guard.js";
import {User_Role} from "../../user/enums/user.enum.js";
import {PostAnswerService} from "../post_answer.service.js";
import {ParseLimitPipe} from "../../_common/pipe/ParseLimitPipe.js";
import {GradePostAnswerDto} from "../dto/post_answer.dto.js";
import {GetRequesterInfo} from "../../_common/decorators/param/request_payload.decorator.js";
import type {RequesterInfo} from "../../_common/types/request.js";

@Controller('admin/post_answer')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminPostAnswerController {
    constructor(private readonly answerService: PostAnswerService) {}

    @Get('post/:post_id')
    getMany(
        @Param('post_id') post_id: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
    ) {
        return this.answerService.adminFindMany({ post_id, page, limit });
    }

    @Get(':answer_id')
    getOne(@Param('answer_id') answer_id: string) {
        return this.answerService.adminFindOne({ answer_id });
    }

    @Patch(':post_id/:answer_id/grade')
    grade(
        @Param('post_id') post_id: string,
        @Param('answer_id') answer_id: string,
        @Body() body: GradePostAnswerDto,
        @GetRequesterInfo() requester: RequesterInfo,
    ) {
        return this.answerService.adminGrade({ post_id, answer_id, admin_id: requester.id, body });
    }
}