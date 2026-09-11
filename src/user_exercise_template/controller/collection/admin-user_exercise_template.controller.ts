// admin/admin-collection.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {UserGuard} from "../../../_other_module/guards/user.guard.js";
import {User_Role} from "../../../user/enums/user.enum.js";
import {UserExerciseTemplateCollectionService} from "../../service/user_exercise_template_collection.service.js";
import {UpdateCollectionDto} from "../../dto/user_exercise_template_collection.dto.js";
import {GetRequesterInfo} from "../../../_common/decorators/param/request_payload.decorator.js";
import type {RequesterInfo} from "../../../_common/types/request.js";

@Controller('admin/exercise_template_collection')
@UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
export class AdminUserExerciseTemplateCollectionController {
    constructor(private readonly collectionService: UserExerciseTemplateCollectionService) {}

    @Get('user/:user_id')
    getManyByUser(
        @Param('user_id') user_id: string,
    ) {
        return this.collectionService.findManyMine({ user_id, page: 1, limit: 100 });
    }

    @Get(':collection_id')
    get(@Param('collection_id') collection_id: string) {
        return this.collectionService.findMine({ collection_id, user_id: undefined as any });
    }

    @Patch(':collection_id')
    update(@Body() body: UpdateCollectionDto, @Param('collection_id') collection_id: string) {
        return this.collectionService.adminUpdate({ collection_id, body });
    }

    @Delete(':collection_id')
    delete(
        @Param('collection_id') collection_id: string,
        @GetRequesterInfo() requester: RequesterInfo,
    ) {
        return this.collectionService.adminSoftDelete({ collection_id, admin_id: requester.id });
    }
}