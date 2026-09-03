import { BaseEntity } from '../../_common/entities/base.entity.js';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../user/entities/user.entity.js';


@Entity('refresh_token')
export class RefreshToken extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.refresh_token, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: Relation<User>;

  @Index()
  @Column({ type: 'varchar', length: 257 })
  token_hash:string ;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  revoked_at: Date | null;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'text', nullable: true })
  ip_address: string | null;

  @OneToOne(() => RefreshToken, (new_token) => new_token.old_token)
  @JoinColumn({ name: 'replaced_by', referencedColumnName: 'id' })
  new_token: RefreshToken;

  //

  @OneToOne(() => RefreshToken, (old_token) => old_token.new_token)
  old_token: RefreshToken;
}
