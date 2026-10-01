import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";
import {User} from "../../user/entities/user.entity.js";
import {Report_Action, Report_Reason, Report_Status, Target_Type} from "../enum/report.enum.js";
import {BaseEntity} from "../../_common/entities/base.entity.js";

@Index(['created_at'])
@Index(['target_id'])
@Index(['status', 'created_at'])
@Entity('report')
export class Report extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.reporter, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user_report: Relation<User>;

  @Column({ type: 'enum', enum: Target_Type })
  target_type: Target_Type;

  @Column({ type: 'uuid' })
  target_id: string;

  @Column({ type: 'enum', enum: Report_Reason })
  reason: Report_Reason;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: Report_Status, default: Report_Status.PENDING })
  status: Report_Status;

  //

  @Column({ type: 'enum', enum: Report_Action, nullable: true })
  action_taken: Report_Action | null;

  @ManyToOne(() => User, (review_by) => review_by.report_reviewer, { nullable: true })
  @JoinColumn({ name: 'reviewed_by', referencedColumnName: 'id' })
  review_by: Relation<User> | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  review_note: string | null;

  //
}
