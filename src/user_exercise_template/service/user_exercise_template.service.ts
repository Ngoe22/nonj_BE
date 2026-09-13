import { Injectable, NotFoundException, UnauthorizedException} from '@nestjs/common';
import {
  CreateExerciseTemplateDto,
} from '../dto/user_exercise_template.dto.js';
import {  InjectRepository } from '@nestjs/typeorm';
import { Repository} from 'typeorm';
import { FilterDbField } from '../../_common/helper/filterQueryForRole.js';
import { UserExerciseTemplate } from '../entities/user_exercise_template.entity.js';
import { User_Setting_Who_can_see_template} from '../../user/enums/user.enum.js';
import {UserExerciseTemplateCollectionService} from "./user_exercise_template_collection.service.js";
import {UserService} from "../../user/user.service.js";
import {FriendshipService} from "../../friendship/friendship.service.js";

// =======================================

type CreateExerciseTemplateInput = CreateExerciseTemplateDto & {
  user: string;
};

// =======================================



@Injectable()
export class UserExerciseTemplateService {
  private exerciseFilterByRole: FilterDbField<UserExerciseTemplate>;

  // ================== EXERCISE TEMPLATE ==================

  constructor(
    @InjectRepository(UserExerciseTemplate)
    private readonly templateRepo: Repository<UserExerciseTemplate>,
    //
    private readonly  collectionService :UserExerciseTemplateCollectionService ,
    private readonly userService : UserService ,
    private readonly friendshipService : FriendshipService

  ) {
    // ============================== Filter DB & QueryField

    this.exerciseFilterByRole = new FilterDbField({
      keyAndLabels: {
        id: ['system_admin', 'me', 'other'],
        title: ['system_admin', 'me', 'other'],
        exercise_content: ['system_admin', 'me', 'other'],
        collection: ['system_admin', 'me', 'other'],
        user: ['system_admin', 'me', 'other'],
        deleted_at : ['system_admin', 'me', 'other'],
      },
      dataBase: UserExerciseTemplate,
    });

  }


  // ---------------  Check Permission ---------------

  private async checkViewPermission(input :  {
    owner_id: string ,
    requester_id: string
  }) {
    const { owner_id, requester_id } = input;

    const setting =  await  this.userService.getSetting(owner_id , 'system_admin');
    if (!setting) {
      throw new NotFoundException({ errorCode: 'owner_not_found' });
    }

    switch (setting.who_can_see_my_template) {
      case  User_Setting_Who_can_see_template.EVERYONE : {
        return true
      }
      case User_Setting_Who_can_see_template.FRIEND : {
        const isFriend = await this.friendshipService.isFriend({ user_id : owner_id , friend_id : requester_id })
        if( isFriend !== 'is' ) throw new UnauthorizedException({ errorCode: 'unauthorized' });
        return true
      }
    }
  }


  // ===========================================



   private async findOne ( input : { template_id: string , data_for : string , user_id ?: string } ) {

     const { template_id ,data_for , user_id } = input;
     const where
          =  user_id ?  {  id : template_id  } :{  id : template_id , user : {id : user_id} }

     const selects =  this.exerciseFilterByRole.buildQuerySelectObject({ label : data_for })
     const collection_selects = this.collectionService.collectionFilterByRole.buildQuerySelectObject({ label : data_for })

     const template = await this.templateRepo.findOne({
       where,
       relations: {collection: true},
       select: {
         ...selects ,
         collection: collection_selects,
       },
     });
     if (!template)
       throw new NotFoundException({ errorCode: 'template_not_found' });
     return template;
   }

   private  async findMany(input: {
     user_id: string;
     data_for: string;
     page: number;
     limit: number;
   }) {
     const { user_id, data_for, page, limit } = input;

     const selects = this.exerciseFilterByRole.buildQuerySelectObject({ label: data_for });
     const collection_selects = this.collectionService.collectionFilterByRole.buildQuerySelectObject({ label: data_for });

     return this.templateRepo.find({
       where: { user : { id : user_id} },
       relations: { collection: true },
       select: { ...selects, collection: collection_selects },
       skip: (page - 1) * limit,
       take: limit,
       order: { created_at: 'DESC' },
     });
   }

   //===============================================

  async findFromOtherUser(input: {
    template_id: string;
    owner_id: string;
    requester_id: string;
  }) {
    const { template_id, owner_id, requester_id } = input;

    if (owner_id === requester_id)
      return this.findMine({template_id, user_id: requester_id})

    await this.checkViewPermission({owner_id: owner_id, requester_id: requester_id,});

    return this.findOne( {
      template_id ,
      data_for : 'other'} )
  }

  async findMine(input: {
    template_id: string;
    user_id: string;
  }) {
    const { template_id , user_id } = input

    return this.findOne( {
      user_id,
      template_id,
      data_for : 'me'} )
  }

  // -------------------- get many --------------------------------


  async findManyMine(input: { user_id: string; page: number; limit: number }) {
    const { user_id, page, limit } = input;
    return this.findMany({
      user_id ,
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
      user_id : owner_id,
      data_for: 'other',
      page,
      limit,
    });
  }



  // ----------------- Create -----------------

  async create(input: CreateExerciseTemplateInput) {

    await this.collectionService.isCollectionBelongToUser({
      collection_id: input.collection,
      user_id: input.user,
    });

    const saveInfo =
        FilterDbField.turnObjInfoToRelationObj (input, ['user', 'collection']) ;
    return this.templateRepo.save(saveInfo);
  }


  // ----------------- Update -----------------


  async update(input: {
    user_id: string;
    template_id: string;
    body: any // UpdateExerciseTemplateDto | DeleteExerciseTemplateDto;
  }) {

    let { user_id, template_id, body } = input;
    if ( body.collection ) {

      const check = await this.collectionService.isCollectionBelongToUser({
        collection_id : body.collection , user_id
      })
      if ( !check ) throw new UnauthorizedException({ errorCode : 'collectio_dont_belong_to_user' } )
      body = FilterDbField.turnObjInfoToRelationObj(body, ['collection']) ;
    }
    const result = await this.templateRepo.update
    ({ user: { id: user_id }, id: template_id }, body );
    if (result.affected === 0) {
      throw new NotFoundException({ errorCode: 'template_or_owner_not_found' });
    }
    return body;
  }

  // ----------------- Delete -----------------

  async softDelete(input: { user_id: string; template_id: string }) {
    const { user_id, template_id } = input;

    const result = await this.templateRepo.update(
        { user: { id: user_id }, id: template_id },
        { deleted_at: new Date() , deleted_by : user_id  } );
    if (result.affected === 0) {
      throw new NotFoundException({ errorCode: 'template_or_owner_not_found' });
    }
    return true;

  }



  // ==================================================================
  //                             ADMIN
  // ==================================================================


  async adminGetOne( input : { template_id: string  }   ) {
    const { template_id } = input;
    return this.findOne( {
      template_id,
      data_for : 'system_admin'} )
  }

  async adminGetMany( input : { user_id: string , page: number, limit : number  }   ) {

  }



  // update share with user


  async adminSoftDelete(input: { template_id: string , admin_id : string }) {
    const { template_id , admin_id} = input;
    const result = await this.templateRepo.update(
        {  id: template_id },
        { deleted_at: new Date() , deleted_by : admin_id  } );
    if (result.affected === 0) {
      throw new NotFoundException({ errorCode: 'template_or_owner_not_found' });
    }
    return true;
  }


}
