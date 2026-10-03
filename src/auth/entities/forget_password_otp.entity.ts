import { BaseEntity } from '../../_common/entities/base.entity.js';
import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation} from 'typeorm';
import { User } from '../../user/entities/user.entity.js';

@Entity('forget_password_otp')
export class ForgetPasswordOtp extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, (user) => user.forget_password_otp, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: Relation<User>;

  @Index()
  @Column({ type: 'varchar', length: 6 })
  code: string;

  /** OTP đã được xác thực thành công chưa (dùng 1 lần) */
  @Column({ type: 'boolean', default: false })
  is_pass_otp: boolean;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

}
