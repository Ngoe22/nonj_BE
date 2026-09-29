import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import {BaseEntity} from "../../_common/entities/base.entity.js";
import {User} from "../../user/entities/user.entity.js";
import {UserExerciseTemplateCollection} from "./user_exercise_template_collection.entity.js";
import {Post} from "../../post/entities/post.entity.js";
import { Question_Type } from '../../post/enum/post.enum.js';



@Index(['created_by'])
@Entity('user_exercise_template')
export class UserExerciseTemplate extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.exercise_template)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user: Relation<User>;

  @Index()
  @ManyToOne(
    () => UserExerciseTemplateCollection,
    (collection) => collection.template,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({
    name: 'collection_id',
    referencedColumnName: 'id',
  })
  collection: UserExerciseTemplateCollection;

  @Column({
    type: 'varchar',
    length: 50,
  })
  title: string;

  @Column({ type: 'enum', enum: Question_Type })
  question_type: Question_Type;

  @Column({
    type: 'jsonb',
  })
  preparation_content: object;

  /**  if multiple require correct_answer */
  @Column({ type: 'jsonb' , nullable: true })
  correct_answer: object | null ;

  // ==============================================
}
