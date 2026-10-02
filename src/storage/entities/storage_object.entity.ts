import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Bản ghi theo dõi 1 object trên R2 (ảnh/mp3).
 *
 * `ref_count` = bao nhiêu post/preparation/avatar đang trỏ tới object này.
 * Được TĂNG/GIẢM mỗi lần tạo/xoá bài (cách realtime), và được cron
 * mark-and-sweep TÍNH LẠI định kỳ để tự sửa lệch.
 */
@Entity('storage_object')
export class StorageObject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Khoá trên R2 (vd: `post/abc.png`) — duy nhất */
  @Index({ unique: true })
  @Column({ type: 'varchar' })
  key: string;

  /** URL công khai đầy đủ (vd: `https://pub-xxx.r2.dev/post/abc.png`) */
  @Column({ type: 'varchar' })
  url: string;

  /** Số lượng tham chiếu đang trỏ tới object */
  @Column({ type: 'int', default: 0 })
  ref_count: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
