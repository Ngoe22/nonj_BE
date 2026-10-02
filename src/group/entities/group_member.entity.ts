

import {Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, type Relation} from 'typeorm';
import {BaseEntity} from "../../_common/entities/base.entity.js";
import {User} from "../../user/entities/user.entity.js";
import { Group_Member_Role} from "../enum/group.enum.js";
import {Group} from "./group.entity.js";

@Index(['group' ,'user'], { unique: true })
@Entity('group_member')
export class GroupMember extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.group_member)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user: Relation<User>;

  @ManyToOne(() => Group, (group) => group.group_member,{onDelete: 'CASCADE'})
  @JoinColumn({
    name: 'group_id',
    referencedColumnName: 'id',
  } )
  group: Relation<Group>;

  @Column({
    type: 'enum',
    enum: Group_Member_Role,
    default: Group_Member_Role.MEMBER,
  })
  role: Group_Member_Role;

  @Column({ type: 'timestamptz', nullable: true })
  rejoin_at: Date;

  //
}
