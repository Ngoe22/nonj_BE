import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from "../../_common/entities/base.entity.js"
import {User} from "./user.entity.js";
import {User_Setting_Who_can_see_template} from "../enums/user.enum.js";

// ==============================

@Entity('user_setting')
export class UserSetting extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @OneToOne(() => User, (user) => user.setting, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user: Relation<User>;

  @Column({
    type: 'enum',
    enum: User_Setting_Who_can_see_template,
    default: User_Setting_Who_can_see_template.ONLY_ME,
  })
  who_can_see_my_template: User_Setting_Who_can_see_template;
}

