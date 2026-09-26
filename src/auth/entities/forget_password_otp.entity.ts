import { BaseEntity } from '../../_common/entities/base.entity.js';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../user/entities/user.entity.js';

@Entity('forget_password_otp')
export class ForgetPasswordOtp extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'timestamp' })
  expires_at: Date;

  // LUU Y ve created_at (ke thua tu BaseEntity):
  // TypeORM ghi @CreateDateColumn bang UTC, nhung cot 'timestamp' thuong (nhu expires_at)
  // lai ghi bang LOCAL. Khi doc lai, driver parse 'timestamp' theo LOCAL -> created_at
  // bi lech (o VN la +7h) so voi thuc te. Vi vay KHONG dung created_at de tinh khoang
  // thoi gian; dung expires_at (cung frame, dung) thay the.
}
