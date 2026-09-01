import * as typeorm from 'typeorm';
import { BaseEntity } from '../../_common/entities/base.entity.js';
import { User } from '../../user/entities/user.entity.js';
import { UserExerciseTemplate } from './user_exercise_template.entity.js';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type {Relation} from 'typeorm';



@Entity('user_exercise_template_collection')
export class UserExerciseTemplateCollection extends BaseEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, (user) => user.exercise_template_collection, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user: Relation<User>;

  @Column({
    type: 'varchar',
    length: 50,
  })
  title: string;

  // ==============================

  @OneToMany(() => UserExerciseTemplate, (template) => template.collection)
  template: Relation<UserExerciseTemplate>;
}
