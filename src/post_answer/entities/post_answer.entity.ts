import { BaseEntity } from '../../_common/entities/base.entity.js';
import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation} from 'typeorm';
import { User } from '../../user/entities/user.entity.js';
import { Post } from '../../post/entities/post.entity.js';
import { Post_Answer_Status } from '../enum/post_answer.enum.js';
import { Group } from '../../group/entities/group.entity.js';

@Index(['group', 'post', 'user'])
@Entity('post_answer')
export class PostAnswer extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.post_answer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: Relation<User>;

  @ManyToOne(() => Post, (post) => post.post_answer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id', referencedColumnName: 'id' })
  post: Relation<Post>;

  @ManyToOne(() => Group, (group) => group.post_answer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id', referencedColumnName: 'id' })
  group: Relation<Group>;

  /**
   * Bài làm của học viên — KHÔNG chứa `point`.
   * Shape song song với `correct_answer`; tự luận là `{type:'essay', text}`.
   */
  @Column({ type: 'jsonb' })
  answer_content: any;

  /** Điểm đạt được — BE chấm tự động phần trắc nghiệm, giáo viên có thể chốt đè */
  @Column({ type: 'float', nullable: true })
  point: number | null;

  /** Tổng điểm tối đa của đề tại thời điểm nộp */
  @Column({ type: 'float', nullable: true })
  max_point: number | null;

  @ManyToOne(() => User, (user_graded) => user_graded.post_answer_graded, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'graded_by', referencedColumnName: 'id' })
  graded_by: Relation<User> | null;

  @Column({ type: 'timestamptz', nullable: true })
  graded_at: Date | null;

  /** `{ auto: GradeResult, manual?: {...} }` — nullable vì bài PENDING chưa chấm */
  @Column({ type: 'jsonb', nullable: true })
  review_content: any | null;

  @Column({
    type: 'enum',
    enum: Post_Answer_Status,
    default: Post_Answer_Status.PENDING,
  })
  status: Post_Answer_Status;
}
