import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import {User} from "../../user/entities/user.entity.js";
import {FriendRequest} from "../../friend_request/entities/friend_request.entity.js";
import {BaseEntity} from "../../_common/entities/base.entity.js";



@Index(['user', 'user_friend'])
@Entity('friendship')
export class Friendship extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp' })
  be_friend_at: Date;

  @ManyToOne(() => User, (user) => user.friend_user)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: Relation<User>;

  @ManyToOne(() => User, (user) => user.friend_user_friend)
  @JoinColumn({ name: 'friend_id', referencedColumnName: 'id' })
  user_friend: Relation<User>;

  @ManyToOne(() => FriendRequest, (request) => request.friendship, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'source_request_id', referencedColumnName: 'id' })
  source_request: Relation<FriendRequest>;
}
