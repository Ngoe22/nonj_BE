import {Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, type Relation} from 'typeorm';
import {User} from "../../user/entities/user.entity.js";
import {Friendship} from "../../friendship/entities/friendship.entity.js";
import {BaseEntity} from "../../_common/entities/base.entity.js";
import { Friend_Request_Status } from '../enum/friend_request.enum.js';


@Index(['sender', 'receiver'])
@Entity('friend_request')
export class FriendRequest extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, (user_sender) => user_sender.friend_request_sender)
  @JoinColumn({ name: 'sender_id', referencedColumnName: 'id' })
  sender: Relation<User>;

  @Index()
  @ManyToOne(
    () => User,
    (user_receiver) => user_receiver.friend_request_receiver,
  )
  @JoinColumn({ name: 'receiver_id', referencedColumnName: 'id' })
  receiver: Relation<User>;


  @Column({
    type: 'enum',
    enum: Friend_Request_Status,
    default: Friend_Request_Status.PENDING,
  })
  status: Friend_Request_Status;

  // ==============================

  @OneToMany(() => Friendship, (friendship) => friendship.source_request)
  friendship: Relation<Friendship>;
}


