// collection.service.ts
import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {FilterDbField} from "../../_common/helper/filterQueryForRole.js";
import {UserExerciseTemplateCollection} from "../entities/user_exercise_template_collection.entity.js";
import {UserExerciseTemplate} from "../entities/user_exercise_template.entity.js";
import {UserService} from "../../user/user.service.js";
import {FriendshipService} from "../../friendship/friendship.service.js";
import {CreateCollectionDto, UpdateCollectionDto} from "../dto/user_exercise_template_collection.dto.js";
import {User_Setting_Who_can_see_template} from "../../user/enums/user.enum.js";


@Injectable()
export class UserExerciseTemplateCollectionService {
    collectionFilterByRole: FilterDbField<UserExerciseTemplateCollection>;

    constructor(
        @InjectRepository(UserExerciseTemplate)
        private readonly templateRepo: Repository<UserExerciseTemplate>,
        @InjectRepository(UserExerciseTemplateCollection)
        private readonly collectionRepo: Repository<UserExerciseTemplateCollection>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly userService: UserService,
        private readonly friendshipService: FriendshipService,
    ) {
        this.collectionFilterByRole = new FilterDbField({
            keyAndLabels: {
                id: ['admin', 'me', 'other'],
                title: ['admin', 'me', 'other'],
            },
            dataBase: UserExerciseTemplateCollection,
            dataSource,
        });
    }

    // ==================== Create ====================

    async create(input: { user_id: string; body: CreateCollectionDto }) {
        const { user_id, body } = input;
        return this.collectionRepo.save({
            title: body.title,
            user: { id: user_id },
        });
    }

    // ==================== Read - One ====================

    private async findOne(input: { condition: object; data_for: string }) {
        const { condition, data_for } = input;

        const selects = this.collectionFilterByRole.buildQuerySelectObject({ label: data_for });

        const collection = await this.collectionRepo.findOne({
            where: condition,
            select: selects,
        });

        if (!collection) {
            throw new NotFoundException({ errorCode: 'collection_not_found' });
        }

        return collection;
    }

    async findMine(input: { collection_id: string; user_id: string }) {
        const { collection_id, user_id } = input;
        return this.findOne({
            condition: { id: collection_id, user: { id: user_id } },
            data_for: 'me',
        });
    }

    async findFromUser(input: {
        collection_id: string;
        owner_id: string;
        requester_id: string;
    }) {
        const { collection_id, owner_id, requester_id } = input;

        if (owner_id === requester_id) {
            return this.findMine({ collection_id, user_id: requester_id });
        }

        await this.checkViewPermission({ owner_id, requester_id });

        return this.findOne({
            condition: { id: collection_id, user: { id: owner_id } },
            data_for: 'other',
        });
    }

    // ==================== Read - Many ====================

    private async findMany(input: {
        condition: object;
        data_for: string;
        page: number;
        limit: number;
    }) {
        const { condition, data_for, page, limit } = input;

        const selects = this.collectionFilterByRole.buildQuerySelectObject({ label: data_for });

        return this.collectionRepo.find({
            where: condition,
            select: selects,
            skip: (page - 1) * limit,
            take: limit,
            order: { created_at: 'DESC' },
        });
    }

    async findManyMine(input: { user_id: string; page: number; limit: number }) {
        const { user_id, page, limit } = input;
        return this.findMany({
            condition: { user: { id: user_id } },
            data_for: 'me',
            page,
            limit,
        });
    }

    async findManyFromUser(input: {
        owner_id: string;
        requester_id: string;
        page: number;
        limit: number;
    }) {
        const { owner_id, requester_id, page, limit } = input;

        if (owner_id === requester_id) {
            return this.findManyMine({ user_id: requester_id, page, limit });
        }

        await this.checkViewPermission({ owner_id, requester_id });

        return this.findMany({
            condition: { user: { id: owner_id } },
            data_for: 'other',
            page,
            limit,
        });
    }

    // ==================== Update ====================

    async update(input: { user_id: string; collection_id: string; body: UpdateCollectionDto }) {
        const { user_id, collection_id, body } = input;

        const result = await this.collectionRepo.update(
            { id: collection_id, user: { id: user_id } },
            body,
        );

        if (result.affected === 0) {
            throw new NotFoundException({ errorCode: 'collection_or_owner_not_found' });
        }
        return true;
    }

    async adminUpdate(input: { collection_id: string; body: UpdateCollectionDto }) {
        const { collection_id, body } = input;

        const result = await this.collectionRepo.update({ id: collection_id }, body);

        if (result.affected === 0) {
            throw new NotFoundException({ errorCode: 'collection_not_found' });
        }
        return true;
    }

    // ==================== Delete ====================

    async softDelete(input: { user_id: string; collection_id: string }) {
        const { user_id, collection_id } = input;

        const result = await this.collectionRepo.update(
            { id: collection_id, user: { id: user_id } },
            { deleted_at: new Date(), deleted_by: user_id },
        );

        if (result.affected === 0) {
            throw new NotFoundException({ errorCode: 'collection_or_owner_not_found' });
        }
        return true;
    }

    async adminSoftDelete(input: { collection_id: string; admin_id: string }) {
        const { collection_id, admin_id } = input;

        const result = await this.collectionRepo.update(
            { id: collection_id },
            { deleted_at: new Date(), deleted_by: admin_id },
        );

        if (result.affected === 0) {
            throw new NotFoundException({ errorCode: 'collection_not_found' });
        }
        return true;
    }

    // ==================== Helper — dùng nội bộ + cho module khác (template) ====================

    async isCollectionBelongToUser(input: { collection_id: string; user_id: string }): Promise<boolean> {
        const { collection_id, user_id } = input;
        return this.collectionRepo.exists({
            where: { id: collection_id, user: { id: user_id } },
        });
    }

    // ==================== Permission check (tái sử dụng cùng logic với template) ====================

    private async checkViewPermission(input: { owner_id: string; requester_id: string }) {
        const { owner_id, requester_id } = input;

        const setting = await this.userService.getSetting(owner_id, 'other');
        if (!setting) throw new NotFoundException({ errorCode: 'owner_not_found' });

        switch (setting.who_can_see_my_template) {
            case User_Setting_Who_can_see_template.EVERYONE:
                return true;

            case User_Setting_Who_can_see_template.FRIEND: {
                const isFriend = await this.friendshipService.isFriend({
                    user_id: requester_id,
                    friend_id: owner_id,
                });
                if (isFriend !== 'is') throw new UnauthorizedException({ errorCode: 'unauthorized' });
                return true;
            }

            default:
                throw new ForbiddenException({ errorCode: 'unauthorized' });
        }
    }
}