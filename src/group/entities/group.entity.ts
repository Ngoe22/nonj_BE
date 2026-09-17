import {Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";
import {BaseEntity} from "../../_common/entities/base.entity.js";
import {User} from "../../user/entities/user.entity.js";
import {Matches} from "class-validator";

import { Group_Join_Mode, Group_View_Mode } from '../enum/group.enum.js';
import {GroupMember} from "./group_member.entity.js";
import {GroupJoinRequest} from "./group_join_request.entity.js";
import {GroupCollection} from "./post_collection.entity.js";
import {Post} from "../../post/entities/post.entity.js";
import {PostAnswer} from "../../post_answer/entities/post_answer.entity.js";


@Entity('group')
export class Group extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, (user) => user.group)
  @JoinColumn({
    name: 'founder_id',
    referencedColumnName: 'id',
  })
  founder: Relation<User>;

  @Index()
  @Matches(/^[a-z0-9]+$/)
  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
  })
  slug: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  description: string;

  @Column({
    type: 'enum',
    enum: Group_Join_Mode,
    default: Group_Join_Mode.BY_REQUEST,
  })
  join_mode: Group_Join_Mode;

  @Column({
    type: 'enum',
    enum: Group_View_Mode,
    default: Group_View_Mode.PRIVATE,
  })
  view_mode: Group_View_Mode;

  // ===============================

  @OneToMany(() => GroupMember, (group_member) => group_member.group)
  group_member: GroupMember;

  @OneToMany(
    () => GroupJoinRequest,
    (group_join_request) => group_join_request.group,
  )
  group_join_request: GroupJoinRequest;

  @OneToMany(() => GroupCollection, (collection) => collection.group)
  collection: Relation<GroupCollection>;

  @OneToMany(() => Post, (post) => post.group)
  post: Relation<Post>;

  @OneToMany(() => PostAnswer, (post_answer) => post_answer.group)
  post_answer: Relation<PostAnswer>;

}

// ZLMT-QZNR