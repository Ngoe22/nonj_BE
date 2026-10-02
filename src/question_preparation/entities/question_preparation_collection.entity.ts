import {Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation} from 'typeorm';

import { BaseEntity } from '../../_common/entities/base.entity.js';
import { User } from '../../user/entities/user.entity.js';
import { QuestionPreparation } from './question_preparation.entity.js';

/** Thư mục cá nhân chứa các đề tự soạn. Tư nhân, chỉ chủ sở hữu thấy. */
@Entity('question_preparation_collection')
export class QuestionPreparationCollection extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, (user) => user.question_preparation_collection, {
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

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  desc: string | null;

  @OneToMany(() => QuestionPreparation, (preparation) => preparation.collection)
  preparation: Relation<QuestionPreparation[]>;
}
