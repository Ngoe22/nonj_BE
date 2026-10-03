import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation} from 'typeorm';
import { User } from '../../user/entities/user.entity.js';
import { User_Notif_Type } from '../enum/user_notif.enum.js';
import { BaseEntity } from '../../_common/entities/base.entity.js';


@Index('notif_user_created_at', ['user', 'created_at'])
@Entity('user_notif')
export class UserNotif extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.notif, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: Relation<User>;

  @Column({ type: 'enum', enum: User_Notif_Type })
  type: User_Notif_Type;

  /**
   * Dữ liệu để FE render +  link. Quy ước:
   *  - NEW_POST / GRADED_POST        : { group_id, collection_id, post_id, title, ... }
   *  - GROUP_JOIN_APPROVED/REJECTED  : { group_id, group_name }
   *  - GROUP_JOIN_REQUEST            : { group_id, group_name, requester_name }
   *  - GROUP_MEMBER_KICKED           : { group_id, group_name }
   *  - GROUP_MEMBER_ROLE_CHANGED     : { group_id, group_name, role }
   *  - FRIEND_REQUEST / _RESPONSE    : { request_id, user_id, user_name, accepted? }
   *  - REPORT_RESOLVED               : { report_id, status, action_taken }
   */
  @Column({ type: 'jsonb' })
  content: object;

  @Column({ type: 'bool', default: false })
  is_read: boolean;
}
