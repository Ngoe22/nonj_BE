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

  @Column({
    type: 'jsonb',
  })
  exercise_content: object;

  // ==============================================

  @OneToMany(() => Post, (post) => post.source_template_id , {onDelete:"SET NULL"})
  post: Post;
}
