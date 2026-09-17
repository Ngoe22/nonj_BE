import {BaseEntity} from "../../_common/entities/base.entity.js";
import {Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation } from "typeorm";
import {User} from "../../user/entities/user.entity.js";
import {UserExerciseTemplate} from "../../user_exercise_template/entities/user_exercise_template.entity.js";
import {PostCollection} from "../../group/entities/post_collection.entity.js";
import {Group} from "../../group/entities/group.entity.js";
import {PostAnswer} from "../../post_answer/entities/post_answer.entity.js";
import {Exercise_Type, Post_Type, View_Each_Other_Answer} from "../enum/post.enum.js";


@Index(['post_collection', 'created_at'])
@Entity('post')
export class Post extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: Post_Type })
  post_type: Post_Type;

  @Column({ type: 'varchar', length: 50 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: Exercise_Type })
  question_type: Exercise_Type;

  @Column({ type: 'jsonb' })
  question_content: object;

  @Column({ type: 'timestamp', nullable: true })
  deadline_at: Date | null;

  @Column({ type: 'bool' })
  retake: boolean;

  @Column({ type: 'enum', enum: View_Each_Other_Answer, default: View_Each_Other_Answer.NEVER })
  view_each_other_answer: View_Each_Other_Answer;

  @ManyToOne(() => User, (user) => user.post)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: Relation<User>;


  @ManyToOne(() => Group)
  @JoinColumn({ name: 'group_id', referencedColumnName: 'id' })
  group: Relation<Group>;

  @ManyToOne(() => PostCollection, (c) => c.post)
  @JoinColumn({ name: 'post_collection_id', referencedColumnName: 'id' })
  post_collection: Relation<PostCollection>;

  @OneToMany(() => PostAnswer, (a) => a.post)
  post_answer: PostAnswer;
}