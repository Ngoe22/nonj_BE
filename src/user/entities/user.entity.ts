import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn, Relation,
  UpdateDateColumn,
} from 'typeorm';
import { User_Role, User_Status } from "../enums/user.enum.js"
import { BaseEntity } from "../../_common/entities/base.entity.js"
import { UserSetting} from "./user_setting.entity.js";
import {UserExerciseTemplate} from "../../user_exercise_template/entities/user_exercise_template.entity.js";
import { UserExerciseTemplateCollection } from "../../user_exercise_template/entities/user_exercise_template_collection.entity.js";
import {Group} from "../../group/entities/group.entity.js";
import {GroupMember} from "../../group/entities/group_member.entity.js";
import {Matches} from "class-validator";
import {GroupJoinRequest} from "../../group/entities/group_join_request.entity.js";
import {FriendRequest} from "../../friend_request/entities/friend_request.entity.js";
import {Friendship} from "../../friendship/entities/friendship.entity.js";
import {UserNotif} from "../../user_notif/entities/user_notif.entity.js";
import {Report} from "../../report/entities/report.entity.js";
import {Post} from "../../post/entities/post.entity.js";
import {PostAnswer} from "../../post_answer/entities/post_answer.entity.js";

@Entity('user')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: User_Role,
    default: User_Role.USER,
  })
  role: User_Role;

  @Index()
  @Matches(/^[a-z0-9]+$/)
  @Column('varchar', {
    length: 50,
    unique: true,
  })
  user_name: string;

  @Index()
  @Column('text', {
    unique: true,
  })
  email: string;

  @Column('text', { nullable: true })
  hash_pw: string | null;

  @Column({
    type: 'varchar',
    length: 50,
  })
  nickname: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  bio: string | null;

  @Column('text', { nullable: true })
  avatar_url: string;

  @Column({
    type: 'enum',
    enum: User_Status,
    default: User_Status.ACTIVE,
  })
  status: User_Status;

  @Column({
    type: 'timestamp',
    nullable: true,
  })
  status_changed_at: Date | null;

  @ManyToOne(() => User, (user) => user.status_changed_users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'status_changed_by',
    referencedColumnName: 'id',
  })
  status_by_admin: Relation<User> | null;

  //=============================
  // admin -> user

  @OneToMany(() => User, (user) => user.status_by_admin)
  status_changed_users: User[];

  // self
  @OneToOne(() => UserSetting, (setting) => setting.user)
  setting: UserSetting;

  @OneToMany(
    () => UserExerciseTemplate,
    (exercise_template) => exercise_template.user,
  )
  exercise_template: UserExerciseTemplate;

  @OneToMany(
    () => UserExerciseTemplateCollection,
    (exercise_template_collection) => exercise_template_collection.user,
  )
  exercise_template_collection: UserExerciseTemplateCollection;

  // group
  @OneToMany(() => Group, (group) => group.user)
  group: Group;

  @OneToMany(() => GroupMember, (group_member) => group_member.user)
  group_member: GroupMember;

  @OneToMany(
    () => GroupJoinRequest,
    (group_join_request) => group_join_request.sender,
  )
  group_join_request_sender: GroupJoinRequest;

  @OneToMany(
    () => GroupJoinRequest,
    (group_join_request) => group_join_request.reviewer,
  )
  group_join_request_reviewer: GroupJoinRequest;

  // friend

  @OneToMany(
    () => FriendRequest,
    (user_sender) => user_sender.friend_request_sender,
  )
  friend_request_sender: FriendRequest;

  @OneToMany(
    () => FriendRequest,
    (user_receiver) => user_receiver.friend_request_receiver,
  )
  friend_request_receiver: FriendRequest;

  @OneToMany(() => FriendRequest, (friend_update_by) => friend_update_by.user)
  friend_update_by: FriendRequest;

  @OneToMany(() => Friendship, (friend_user) => friend_user.user)
  friend_user: Friendship;

  @OneToMany(
    () => Friendship,
    (friend_user_friend) => friend_user_friend.user_friend,
  )
  friend_user_friend: Friendship;

  // Post

  @OneToMany(() => Post, (post) => post.user)
  post: Post;

  @OneToMany(() => PostAnswer, (post_answer) => post_answer.user)
  post_answer: PostAnswer;

  @OneToMany(
    () => PostAnswer,
    (post_answer_graded_by) => post_answer_graded_by.graded_by,
  )
  post_answer_graded: PostAnswer;

  // Notif

  @OneToMany(() => UserNotif, (notif) => notif.user)
  notif: UserNotif;

  // Report

  @OneToMany(() => Report, (reporter) => reporter.user_report)
  reporter: Report;

  @OneToMany(() => Report, (report_reviewer) => report_reviewer.review_by)
  report_reviewer: Report;
}

