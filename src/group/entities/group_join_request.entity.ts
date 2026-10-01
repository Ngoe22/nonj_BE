import {Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import  type { Relation } from 'typeorm';
import {BaseEntity} from "../../_common/entities/base.entity.js";
import {User} from "../../user/entities/user.entity.js";
import {Group_Join_Request_Status, Group_Member_Role} from "../enum/group.enum.js";
import {Group} from "./group.entity.js";

// PHẢI đặt tên tường minh: TypeORM sinh tên index bằng
// sha1(table + '_' + các cột ĐÃ SORT), nên 2 khai báo trên cùng tập cột mà khác
// thứ tự sẽ cho CÙNG một tên -> `synchronize` chết với
// 'relation "IDX_..." already exists'.
// Trong Postgres thứ tự cột của composite index là khác nhau thật, nên giữ cả hai.
@Index('idx_group_join_request_sender_group', ['sender', 'group', 'created_at'])
@Index('idx_group_join_request_group_sender', ['group', 'sender', 'created_at'])
@Entity('group_join_request')
export class GroupJoinRequest extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.group_join_request_sender)
  @JoinColumn({
    name: 'sender_id',
    referencedColumnName: 'id',
  })
  sender: Relation<User>;

  @ManyToOne(() => Group, (group) => group.group_join_request)
  @JoinColumn({
    name: 'group_id',
    referencedColumnName: 'id',
  })
  group: Relation<Group>;

  @Column({
    type: 'enum',
    enum: Group_Join_Request_Status,
    default: Group_Join_Request_Status.PENDING,
  })
  status: Group_Join_Request_Status;

  @ManyToOne(() => User, (user) => user.group_join_request_reviewer, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'reviewer_id',
    referencedColumnName: 'id',
  })
  reviewer: Relation<User> | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  //
}
