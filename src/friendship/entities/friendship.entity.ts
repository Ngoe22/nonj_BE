import {Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "../../user/entities/user.entity.js";
import {FriendRequest} from "../../friend_request/entities/friend_request.entity.js";
import {BaseEntity} from "../../_common/entities/base.entity.js";



@Index( [ "user_id" , "friend_id" ] )
export class Friendship extends BaseEntity  {

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne( () => User, user => user.friend_user )
    @JoinColumn({ name: "user_id" , referencedColumnName : "id" })
    user : User

    @ManyToOne( () => User, user => user.friend_user_friend )
    @JoinColumn({ name: "friend_id" , referencedColumnName : "id" })
    user_friend : User

    @OneToOne( () => FriendRequest, request => request.friendship )
    @JoinColumn({ name: "source_request_id" , referencedColumnName : "id" })
    request : FriendRequest


}
