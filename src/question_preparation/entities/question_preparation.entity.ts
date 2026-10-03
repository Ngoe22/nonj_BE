import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation} from 'typeorm';
import { BaseEntity } from '../../_common/entities/base.entity.js';
import { User } from '../../user/entities/user.entity.js';
import { QuestionPreparationCollection } from './question_preparation_collection.entity.js';


@Index(['created_by'])
@Entity('question_preparation')
export class QuestionPreparation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.question_preparation)
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user: Relation<User>;

  @Index()
  @ManyToOne(
    () => QuestionPreparationCollection,
    (collection) => collection.preparation,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({
    name: 'collection_id',
    referencedColumnName: 'id',
  })
  collection: Relation<QuestionPreparationCollection>;

  @Column({
    type: 'varchar',
    length: 50,
  })
  title: string;

  /**
   * Nội dung đề — mảng `section`, ĐÃ TÁCH ĐÁP ÁN.
   * Đáp án nằm riêng ở `correct_answer`, song song theo [sectionIndex][itemIndex].
   */
  @Column({ type: 'jsonb' })
  content: object;

  /** Đáp án đúng — song song với `content`. Null khi đề không có đáp án cố định. */
  @Column({ type: 'jsonb', nullable: true })
  correct_answer: object | null;
}
