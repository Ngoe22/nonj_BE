import {Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";
import {BaseEntity} from "../../_common/entities/base.entity.js";

import {Group} from "./group.entity.js";
import {Post} from "../../post/entities/post.entity.js";

@Index(['created_at'])
@Entity('group_collection')
export class GroupCollection extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  title: string;

  @Index()
  @ManyToOne(() => Group, (group) => group.collection)
  @JoinColumn({ name: 'group_id', referencedColumnName: 'id' })
  group: Relation<Group>;

  //

  @OneToMany(() => Post, (post) => post.group_collection)
  post: Relation<Post>;
}
