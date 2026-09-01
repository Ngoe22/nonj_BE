import {Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "../../user/entities/user.entity.js";
import {Friendship} from "../../friendship/entities/friendship.entity.js";
import {BaseEntity} from "../../_common/entities/base.entity.js";

export class FriendRequest extends BaseEntity  {

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Index()
    @ManyToOne( () => User, user_sender => user_sender.friend_request_sender )
    @JoinColumn({ name: "sender_id" , referencedColumnName : "id" })
    friend_request_sender : User


    @Index()
    @ManyToOne( () => User, user_receiver => user_receiver.friend_request_receiver )
    @JoinColumn({ name: "receiver_id" , referencedColumnName : "id" })
    friend_request_receiver : User

    //

    @OneToOne(() => Friendship , friendship => friendship.request )
    friendship : Friendship

}


