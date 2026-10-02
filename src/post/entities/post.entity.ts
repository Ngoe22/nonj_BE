import {BaseEntity} from "../../_common/entities/base.entity.js";
import {Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation } from "typeorm";
import {User} from "../../user/entities/user.entity.js";
import {PostCollection} from "../../group/entities/post_collection.entity.js";
import {Group} from "../../group/entities/group.entity.js";
import {PostAnswer} from "../../post_answer/entities/post_answer.entity.js";
import {Retake, View_Each_Other_Answer} from "../enum/post.enum.js";


@Index(['post_collection', 'created_at'])
@Entity('post')
export class Post extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Nội dung đề — mảng `section`, ĐÃ TÁCH ĐÁP ÁN (giống QuestionPreparation).
   * Bỏ `question_type` cấp post: mỗi section tự mang loại của nó.
   */
  @Column({ type: 'jsonb' })
  content: object;

  /** Đáp án đúng — song song với `content`, chỉ trả cho giáo viên/admin. */
  @Column({ type: 'jsonb', nullable: true })
  correct_answer: object | null;

  // ================

  @Column({ type: 'timestamptz', nullable: true })
  deadline_at: Date | null;

  @Column({ type: 'enum', enum: Retake, default: Retake.NEVER })
  retake: Retake;

  @Column({
    type: 'enum',
    enum: View_Each_Other_Answer,
    default: View_Each_Other_Answer.NEVER,
  })
  view_each_other_answer: View_Each_Other_Answer;

  //  ======================

  @ManyToOne(() => User, (user) => user.post)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: Relation<User>;

  // onDelete CASCADE: xoá cứng nhóm/bộ sưu tập thì bài tập đi theo.
  // Cần cho cron dọn dữ liệu xoá mềm quá 2 tuần — nếu để NO ACTION, xoá nhóm sẽ
  // bị khoá ngoại chặn vì con của nó vẫn đang sống.
  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id', referencedColumnName: 'id' })
  group: Relation<Group>;

  @ManyToOne(() => PostCollection, (c) => c.post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_collection_id', referencedColumnName: 'id' })
  post_collection: Relation<PostCollection>;

  @OneToMany(() => PostAnswer, (a) => a.post)
  post_answer: PostAnswer[];
}