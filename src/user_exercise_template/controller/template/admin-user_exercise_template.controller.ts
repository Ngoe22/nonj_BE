import {
    Body,
    Controller,
    DefaultValuePipe,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Query,
    UseGuards
} from "@nestjs/common";
import {UserGuard} from "../../../_other_module/guards/user.guard.js";
import {User_Role} from "../../../user/enums/user.enum.js";
import {UpdateExerciseTemplateDto} from "../../dto/user_exercise_template.dto.js";
import {GetRequesterInfo} from "../../../_common/decorators/param/request_payload.decorator.js";
import type {RequesterInfo} from "../../../_common/types/request.js";
import {ParseLimitPipe} from "../../../_common/pipe/ParseLimitPipe.js";
import {UserExerciseTemplateService} from "../../service/user_exercise_template.service.js";


@Controller('admin/user_exercise_template')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class UserExerciseTemplateController {
    constructor(
        private readonly exerciseTemplateService: UserExerciseTemplateService
    ) {

    }


    // ================== EXERCISE TEMPLATE ==================

    @Get('/:template_id')
    get(
        @Param('template_id') template_id: string,
    ) {
        return this.exerciseTemplateService.findOne( {
            condition : {id : template_id} , data_for : "admin"
        } );
    }

    @Get('user/:user_id')
    getMany(
        @Param('user_id') user_id: string,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
    ) {
        return this.exerciseTemplateService.findMany( {
            condition : {  user : { id :  user_id } } ,
            data_for : "admin" ,
            page,
            limit,
        } );
    }


    @Patch(':user_id/:template_id')
    update(
        @Body() body: UpdateExerciseTemplateDto,
        @Param('template_id') template_id: string,
        @Param('user_id') user_id: string,
    ) {
        return this.exerciseTemplateService.update({
            body, user_id, template_id,
        });
    }

    @Delete(':template_id')
    delete(
        @Param('template_id') template_id: string,
        @GetRequesterInfo() requester: RequesterInfo,
    ) {
        return this.exerciseTemplateService.adminSoftDelete({
            admin_id : requester.id, template_id,
        });
    }


    // ================== COLLECTION ==================


}