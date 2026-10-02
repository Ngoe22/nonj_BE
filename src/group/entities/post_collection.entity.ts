import {Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";
import {BaseEntity} from "../../_common/entities/base.entity.js";

import {Group} from "./group.entity.js";
import {Post} from "../../post/entities/post.entity.js";

@Index(['created_at'])
@Entity('post_collection')
export class PostCollection extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  title: string;

  @Column({ type: 'varchar', length: 100  ,nullable: true })
  desc: string;

  @Index()
  // CASCADE: xoá cứng nhóm thì bộ sưu tập đi theo (và bài tập trong đó cũng vậy)
  @ManyToOne(() => Group, (group) => group.collection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id', referencedColumnName: 'id' })
  group: Relation<Group>;

  //

  @OneToMany(() => Post, (post) => post.post_collection)
  post: Relation<Post>;
}
