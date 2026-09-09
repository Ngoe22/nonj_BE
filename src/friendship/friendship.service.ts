import {Injectable, NotFoundException} from '@nestjs/common';
import {InjectDataSource, InjectRepository} from "@nestjs/typeorm";
import {FriendRequest} from "../friend_request/entities/friend_request.entity.js";
import {DataSource, Repository} from "typeorm";
import {Friendship} from "./entities/friendship.entity.js";
import {FilterDbField} from "../_common/helper/filterQueryForRole.js";
import {Transactional} from "typeorm-transactional";


// ======================================================================

@Injectable()
export class FriendshipService {
    friendShipFilterByRole: FilterDbField<Friendship>;

    constructor(

        @InjectRepository(Friendship)
        private readonly friendshipRepo: Repository<Friendship>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {

      this.friendShipFilterByRole = new FilterDbField({
        keyAndLabels: {
          id: ['admin', 'me'],
          user: ['admin', 'me'],
          user_friend: ['admin', 'me'],
          request : ['admin', ],
          created_at: ['admin', ],
          updated_at: ['admin', ],
          deleted_at: ['admin'],
        },
        dataBase: Friendship,
        dataSource,
      });

    }

    @Transactional()
   async create ( body :{
     user_id : string ,
     user_friend_id : string ,
     source_request_id  : string ,
   }) {

      const saveInfo1 = FilterDbField.turnObjInfoToRelationObj(
          {
            user: body.user_id,
            user_friend: body.user_friend_id,
            source_request_id: body.source_request_id,
          },
          ['user', 'user_friend', 'source_request_id'],
      );

      const saveInfo2 = FilterDbField.turnObjInfoToRelationObj(
          {
            user: body.user_friend_id,
            user_friend: body.user_id,
            source_request_id: body.source_request_id,
          },
          ['user', 'user_friend', 'source_request_id'],
      );

      await this.friendshipRepo.save(saveInfo1);
      await this.friendshipRepo.save(saveInfo2);

      return true;
   }

   async delete ( input : { user_id: string , id: string  } ) {
      const { user_id , id  } = input;
      const result = await  this.friendshipRepo.update(
          { id , user : { id : user_id } } ,
          { deleted_at: new Date() ,deleted_by : user_id },
      )
     if ( result.affected === 0 ) {
       throw new NotFoundException({ errorCode : 'delete_info_not_found' });
     }
     return true;
   }


  async isFriend(input: { user_id: string; friend_id: string }): Promise<'never' | 'was' | 'is'> {
    const { user_id, friend_id } = input;

    const result = await this.friendshipRepo.findOne({
      where: { user: { id: user_id }, user_friend: { id: friend_id } },
      withDeleted: true,
    });

    if (!result) return 'never';
    if (result.deleted_at) return 'was';
    return 'is';
  }


  // ======= private ======


}
