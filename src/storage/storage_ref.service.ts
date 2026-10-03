import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { StorageObject } from './entities/storage_object.entity.js';
import { R2Service } from './r2.service.js';
import { Post } from '../post/entities/post.entity.js';
import { QuestionPreparation } from '../question_preparation/entities/question_preparation.entity.js';
import { User } from '../user/entities/user.entity.js';

/**
 * Đếm tham chiếu tới object trên R2.
 *
 * Mỗi object (ảnh/mp3) có thể được NHIỀU post/preparation/avatar trỏ tới cùng
 * lúc (vd: tạo post từ preparation copy nguyên `img_url`). `ref_count` cho biết
 * còn bao nhiêu nơi dùng nó.
 *
 * - TĂNG/GIẢM realtime khi tạo/xoá bài (cách của user).
 * - `recountAll()` = mark-and-sweep, chạy ĐỊNH KỲ để tính lại từ DB (tự sửa lệch).
 */
@Injectable()
export class StorageRefService {
  constructor(
    @InjectRepository(StorageObject)
    private readonly repo: Repository<StorageObject>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly r2Service: R2Service,
  ) {}

  // ============================================================
  // TRÍCH URL / KEY
  // ============================================================

  /** Đổi URL đầy đủ thành key trên R2 (bóc base `R2_PUBLIC_URL`) */
  urlToKey(url: string): string {
    const base = this.r2Service.getPublicUrlBase();
    if (base && url.startsWith(`${base}/`)) return url.slice(base.length + 1);
    // fallback: bóc origin nếu không khớp base (vd custom domain)
    const m = /^https?:\/\/[^/]+\/(.+)$/.exec(url);
    return m ? m[1] : url;
  }

  /**
   * Thu thập MỌI `img_url`/`mp3_url` trong cấu trúc content (đệ quy, không phụ
   * thuộc shape cụ thể). Trả về danh sách URL DUY NHẤT.
   */
  extractMediaUrls(content: unknown): string[] {
    const urls = new Set<string>();
    const walk = (node: unknown): void => {
      if (node == null) return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node === 'object') {
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
          if (
            (k === 'img_url' || k === 'mp3_url') &&
            typeof v === 'string' &&
            v.trim()
          ) {
            urls.add(v.trim());
          } else {
            walk(v);
          }
        }
      }
    };
    walk(content);
    return [...urls];
  }

  /** Đếm SỐ ảnh và SỐ mp3 (riêng biệt) trong content — để enforce giới hạn */
  countMedia(content: unknown): { images: number; audio: number } {
    let images = 0;
    let audio = 0;
    const walk = (node: unknown): void => {
      if (node == null) return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (typeof node === 'object') {
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
          if (typeof v === 'string' && v.trim()) {
            if (k === 'img_url') images++;
            else if (k === 'mp3_url') audio++;
          } else {
            walk(v);
          }
        }
      }
    };
    walk(content);
    return { images, audio };
  }

  // ============================================================
  // GHI NHẬN UPLOAD / TĂNG GIẢM
  // ============================================================

  /** Ghi nhận object NGAY KHI cấp presigned URL (ref_count=0) */
  async recordUpload(key: string, url: string): Promise<void> {
    const exists = await this.repo.findOne({ where: { key } });
    if (!exists) {
      await this.repo.save({ key, url, ref_count: 0 });
    }
  }

  /**
   * Đồng bộ tham chiếu cho MỘT nội dung (post/preparation) khi tạo/sửa.
   * `oldContent`/`newContent` là `QuestionContentSection[]` (hoặc null khi tạo/xoá).
   */
  async syncContentReferences(
    oldContent: unknown,
    newContent: unknown,
  ): Promise<void> {
    const before = new Set(this.extractMediaUrls(oldContent));
    const after = new Set(this.extractMediaUrls(newContent));

    const added = [...after].filter((u) => !before.has(u));
    const removed = [...before].filter((u) => !after.has(u));

    await this.applyDelta(added, removed);
  }

  /**
   * Đổi avatar: trả ref của avatar cũ và XOÁ LUÔN file cũ trên R2 (theo yêu cầu).
   */
  async syncAvatar(oldUrl: string | null, newUrl: string | null): Promise<void> {
    if (oldUrl && oldUrl !== newUrl) {
      await this.applyDelta([], [oldUrl]);
      try {
        await this.r2Service.deleteObject(this.urlToKey(oldUrl));
      } catch {
        // R2 chưa cấu hình hoặc file không tồn tại — bỏ qua
      }
    }
    if (newUrl && newUrl !== oldUrl) {
      await this.applyDelta([newUrl], []);
    }
  }

  private async applyDelta(added: string[], removed: string[]): Promise<void> {
    for (const url of added) await this.bump(url, +1);
    for (const url of removed) await this.bump(url, -1);
  }

  private async bump(url: string, delta: number): Promise<void> {
    const key = this.urlToKey(url);
    const existing = await this.repo.findOne({ where: { key } });

    if (existing) {
      existing.ref_count = Math.max(0, existing.ref_count + delta);
      await this.repo.save(existing);
    } else if (delta > 0) {
      await this.repo.save({ key, url, ref_count: 1 });
    }
    // delta < 0 mà không có bản ghi -> không có gì để giảm, bỏ qua
  }

  // ============================================================
  // MARK-AND-SWEEP (tính lại từ DB)
  // ============================================================

  /** Đếm số tham chiếu theo key từ TOÀN BỘ DB (post + preparation + avatar) */
  async collectReferencedCounts(): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    const addUrl = (url: string | null | undefined): void => {
      if (!url) return;
      const key = this.urlToKey(url);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    };
    const addContent = (content: unknown): void => {
      for (const url of this.extractMediaUrls(content)) addUrl(url);
    };

    const posts = await this.dataSource
      .getRepository(Post)
      .find({ select: { content: true } });
    for (const p of posts) addContent(p.content);

    const preps = await this.dataSource
      .getRepository(QuestionPreparation)
      .find({ select: { content: true } });
    for (const p of preps) addContent(p.content);

    const users = await this.dataSource
      .getRepository(User)
      .find({ select: { avatar_url: true } });
    for (const u of users) addUrl(u.avatar_url);

    return counts;
  }

  /** Tính lại `ref_count` của MỌI bản ghi từ DB (tự sửa lệch) */
  async recountAll(): Promise<number> {
    const counts = await this.collectReferencedCounts();
    const rows = await this.repo.find();
    let fixed = 0;
    for (const row of rows) {
      const actual = counts.get(row.key) ?? 0;
      if (row.ref_count !== actual) {
        row.ref_count = actual;
        await this.repo.save(row);
        fixed++;
      }
    }
    return fixed;
  }

  /**
   * Xoá object mồ côi: `ref_count == 0` VÀ đã quá `graceDays` ngày.
   * Trả về số object đã xoá.
   */
  async collectGarbage(graceDays = 7): Promise<number> {
    const cutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);
    /*
     * ⚠️ Lọc theo `updated_at` (lần cuối ref_count ĐỔI), KHÔNG phải `created_at`.
     *
     * Trước đây dùng `created_at` nên với file CŨ thì không có ngày ân hạn nào:
     * ảnh upload 3 tháng trước, hôm nay bỏ ra khỏi bài -> `created_at` đã 3 tháng
     * -> cron 4h sáng HÔM SAU xoá ngay. Comment ghi "đã quá 7 ngày" nhưng thực tế
     * không đúng.
     *
     * `updated_at` là `@UpdateDateColumn` nên tự đổi mỗi lần ref_count tăng/giảm
     * -> đúng nghĩa "object mồ côi ĐÃ 7 NGÀY".
     */
    const candidates = (await this.repo.find({ where: { ref_count: 0 } })).filter(
      (c) => c.updated_at && c.updated_at < cutoff,
    );
    if (candidates.length === 0) return 0;

    // Lưới an toàn: xác minh lại với DB trước khi xoá (tránh ref_count lệch
    // khiến ảnh đang dùng bị xoá nhầm).
    const counts = await this.collectReferencedCounts();
    let deleted = 0;
    for (const row of candidates) {
      const actual = counts.get(row.key) ?? 0;
      if (actual > 0) {
        row.ref_count = actual;
        await this.repo.save(row);
        continue;
      }
      try {
        await this.r2Service.deleteObject(row.key);
      } catch {
        // R2 chưa cấu hình — bỏ qua, không chặn toàn bộ cron
      }
      await this.repo.remove(row);
      deleted++;
    }
    return deleted;
  }

  /**
   * Danh sách object trong kho — cho trang admin xem R2 đang giữ những gì.
   *
   * `onlyOrphans` = chỉ lấy object `ref_count === 0` (rác chờ cron dọn).
   */
  async listObjects(options: {
    page?: number;
    limit?: number;
    onlyOrphans?: boolean;
  }): Promise<{
    items: StorageObject[];
    total: number;
    page: number;
    limit: number;
    stats: { total: number; orphans: number; referenced: number };
  }> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));

    const [items, total] = await this.repo.findAndCount({
      where: options.onlyOrphans ? { ref_count: 0 } : {},
      order: { updated_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Số liệu tổng cho phần đầu trang
    const totalAll = await this.repo.count();
    const orphans = await this.repo.count({ where: { ref_count: 0 } });

    return {
      items,
      total,
      page,
      limit,
      stats: {
        total: totalAll,
        orphans,
        referenced: totalAll - orphans,
      },
    };
  }

  /**
   * Xoá NGAY các object người dùng vừa upload nhưng KHÔNG dùng tới — trường hợp
   * upload ảnh/mp3 xong rồi bấm huỷ hoặc đóng form mà không lưu.
   *
   * An toàn: CHỈ xoá khi `ref_count === 0`. File đã được bài nào đó tham chiếu
   * sẽ được giữ nguyên, nên gọi nhầm (hoặc gọi sau khi đã lưu thành công) cũng
   * không làm mất dữ liệu. Nếu lần này lỗi thì cron 7 ngày vẫn dọn sau.
   */
  async discardUnused(keys: string[]): Promise<number> {
    if (!Array.isArray(keys) || keys.length === 0) return 0;

    // Giới hạn số key mỗi lần gọi — tránh client gửi mảng khổng lồ.
    const unique = [...new Set(keys.filter((k) => typeof k === 'string' && k))].slice(
      0,
      100,
    );
    if (unique.length === 0) return 0;

    const rows = await this.repo.find({ where: { key: In(unique) } });
    let deleted = 0;
    for (const row of rows) {
      if (row.ref_count > 0) continue; // đang được dùng -> GIỮ
      try {
        await this.r2Service.deleteObject(row.key);
      } catch {
        // R2 chưa cấu hình — bỏ qua
      }
      await this.repo.remove(row);
      deleted++;
    }
    return deleted;
  }
}
