import {
    Body, Controller, DefaultValuePipe, Delete, Get, Param,
    ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import {UserExerciseTemplateCollectionService} from "../../service/user_exercise_template_collection.service.js";
import {CreateCollectionDto, UpdateCollectionDto} from "../../dto/user_exercise_template_collection.dto.js";
import {GetRequesterInfo} from "../../../_common/decorators/param/request_payload.decorator.js";
import type {RequesterInfo} from "../../../_common/types/request.js";
import {ParseLimitPipe} from "../../../_common/pipe/ParseLimitPipe.js";


// ===========================================

@Controller('exercise_template_collection')
export class UserExerciseTemplateCollectionController {
    constructor(private readonly collectionService: UserExerciseTemplateCollectionService) {}

    @Post()
    create(@Body() body: CreateCollectionDto, @GetRequesterInfo() requester: RequesterInfo) {
        return this.collectionService.create({ user_id: requester.id, body });
    }

    // ----

    @Get('me')
    getManyMine(
        @GetRequesterInfo() requester: RequesterInfo,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
    ) {
        return this.collectionService.findManyMine({ user_id: requester.id, page, limit });
    }

    @Get('me/:collection_id')
    getMine(
        @GetRequesterInfo() requester: RequesterInfo,
        @Param('collection_id') collection_id: string,
    ) {
        return this.collectionService.findMine({ collection_id, user_id: requester.id });
    }
    //
    // @Get(':user_id')
    // getManyFromUser(
    //     @GetRequesterInfo() requester: RequesterInfo,
    //     @Param('user_id') user_id: string,
    //     @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    //     @Query('limit', new DefaultValuePipe(20), ParseLimitPipe) limit: number,
    // ) {
    //     return this.collectionService.findManyFromUser({
    //         owner_id: user_id,
    //         requester_id: requester.id,
    //         page,
    //         limit,
    //     });
    // }
    //
    // @Get(':user_id/:collection_id')
    // getFromUser(
    //     @GetRequesterInfo() requester: RequesterInfo,
    //     @Param('user_id') user_id: string,
    //     @Param('collection_id') collection_id: string,
    // ) {
    //     return this.collectionService.findFromUser({
    //         collection_id,
    //         owner_id: user_id,
    //         requester_id: requester.id,
    //     });
    // }

    @Patch('me/:collection_id')
    update(
        @Body() body: UpdateCollectionDto,
        @Param('collection_id') collection_id: string,
        @GetRequesterInfo() requester: RequesterInfo,
    ) {
        return this.collectionService.update({ user_id: requester.id, collection_id, body });
    }

    @Delete('me/:collection_id')
    delete(
        @Param('collection_id') collection_id: string,
        @GetRequesterInfo() requester: RequesterInfo,
    ) {
        return this.collectionService.softDelete({ user_id: requester.id, collection_id });
    }
}