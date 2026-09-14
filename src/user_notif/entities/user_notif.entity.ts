import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";
import {User} from "../../user/entities/user.entity.js";
import {User_Notif_Type} from "../enum/user_notif.enum.js";
import { BaseEntity } from '../../_common/entities/base.entity.js';


Index( "notif_user_created_at",  [ "user_id" , "created_at" ] )
@Entity('user_notif')
export class UserNotif extends BaseEntity{

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.notif)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: Relation<User>;

  @Column({ type: 'enum', enum: User_Notif_Type })
  type: User_Notif_Type;

  @Column({ type: 'jsonb' })
  content: object;

  @Column({ type: 'bool', default: false })
  is_read: boolean;

}
