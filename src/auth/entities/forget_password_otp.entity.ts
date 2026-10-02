import { BaseEntity } from '../../_common/entities/base.entity.js';
import {Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, type Relation} from 'typeorm';
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

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  // GHI CHU (đã xử lý): trước đây cột dùng `timestamp` KHÔNG có múi giờ, nên
  // @CreateDateColumn (Postgres tự điền) lưu UTC còn cột app tự ghi (expires_at)
  // lại lưu giờ local — hai cột LỆCH NHAU 7 giờ ở VN, không so sánh được.
  // Nay mọi cột thời gian đều là `timestamptz`: lưu một mốc tuyệt đối, đọc ra
  // luôn đúng bất kể tiến trình chạy ở múi giờ nào.
}
