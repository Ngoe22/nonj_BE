import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Bảng cấu hình động (key-value) — admin chỉnh được qua UI mà không cần deploy.
 * Ví dụ: `post_max_images=2`, `post_max_audio=2`.
 */
@Entity('app_config')
export class AppConfig {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  value: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
