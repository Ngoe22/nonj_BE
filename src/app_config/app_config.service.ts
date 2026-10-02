import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfig } from './app_config.entity.js';

/** Tên các khoá cấu hình được dùng trong code */
export const CONFIG_KEYS = {
  postMaxImages: 'post_max_images',
  postMaxAudio: 'post_max_audio',
  homeText: 'home_text',
  contactFacebook: 'contact_facebook',
  contactEmail: 'contact_email',
} as const;

/** Khoá kiểu SỐ NGUYÊN + giá trị mặc định */
export const CONFIG_INT_DEFAULTS: Record<string, number> = {
  [CONFIG_KEYS.postMaxImages]: 2,
  [CONFIG_KEYS.postMaxAudio]: 2,
};

/** Khoá kiểu CHUỖI + giá trị mặc định (rỗng = chưa cấu hình -> FE ẩn phần đó) */
export const CONFIG_STRING_DEFAULTS: Record<string, string> = {
  [CONFIG_KEYS.homeText]: '',
  [CONFIG_KEYS.contactFacebook]: '',
  [CONFIG_KEYS.contactEmail]: '',
};

/** Độ dài tối đa cho khoá chuỗi */
export const CONFIG_STRING_MAX_LENGTH: Record<string, number> = {
  [CONFIG_KEYS.homeText]: 2000,
  [CONFIG_KEYS.contactFacebook]: 300,
  [CONFIG_KEYS.contactEmail]: 200,
};

/** Toàn bộ khoá hợp lệ = số + chuỗi */
export const CONFIG_ALL_KEYS: string[] = [
  ...Object.keys(CONFIG_INT_DEFAULTS),
  ...Object.keys(CONFIG_STRING_DEFAULTS),
];

/** Giữ tên cũ để không phá chỗ đang import */
export const CONFIG_DEFAULTS: Record<string, number> = CONFIG_INT_DEFAULTS;

export interface MediaLimits {
  images: number;
  audio: number;
}

/** Cấu hình công khai mà FE được đọc (không có gì nhạy cảm) */
export interface PublicConfig {
  post_max_images: number;
  post_max_audio: number;
  home_text: string;
  contact_facebook: string;
  contact_email: string;
}

export interface SetValueResult {
  ok: boolean;
  errorCode?: string;
}

@Injectable()
export class AppConfigService {
  constructor(
    @InjectRepository(AppConfig)
    private readonly repo: Repository<AppConfig>,
  ) {}

  /** Đọc 1 khoá kiểu số nguyên (fallback mặc định nếu chưa set) */
  async getInt(key: string): Promise<number> {
    const row = await this.repo.findOne({ where: { key } });
    if (!row) return CONFIG_INT_DEFAULTS[key] ?? 0;
    const n = Number(row.value);
    return Number.isFinite(n) && n >= 0
      ? n
      : (CONFIG_INT_DEFAULTS[key] ?? 0);
  }

  /** Đọc 1 khoá kiểu chuỗi (fallback mặc định nếu chưa set) */
  async getString(key: string): Promise<string> {
    const row = await this.repo.findOne({ where: { key } });
    return row?.value ?? CONFIG_STRING_DEFAULTS[key] ?? '';
  }

  /** Giới hạn ảnh/mp3 cho bài post + kho đề */
  async getMediaLimits(): Promise<MediaLimits> {
    const [images, audio] = await Promise.all([
      this.getInt(CONFIG_KEYS.postMaxImages),
      this.getInt(CONFIG_KEYS.postMaxAudio),
    ]);
    return { images, audio };
  }

  /** Cấu hình cho FE (giới hạn upload + nội dung trang chủ) */
  async getPublicConfig(): Promise<PublicConfig> {
    const [images, audio, homeText, facebook, email] = await Promise.all([
      this.getInt(CONFIG_KEYS.postMaxImages),
      this.getInt(CONFIG_KEYS.postMaxAudio),
      this.getString(CONFIG_KEYS.homeText),
      this.getString(CONFIG_KEYS.contactFacebook),
      this.getString(CONFIG_KEYS.contactEmail),
    ]);

    return {
      post_max_images: images,
      post_max_audio: audio,
      home_text: homeText,
      contact_facebook: facebook,
      contact_email: email,
    };
  }

  /** Toàn bộ cấu hình dạng chuỗi (dành cho admin UI) */
  async getAll(): Promise<Record<string, string>> {
    const rows = await this.repo.find();
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(CONFIG_INT_DEFAULTS)) {
      out[key] = String(value);
    }
    for (const [key, value] of Object.entries(CONFIG_STRING_DEFAULTS)) {
      out[key] = value;
    }
    for (const r of rows) out[r.key] = r.value;
    return out;
  }

  /**
   * Ghi 1 khoá (upsert) — tự nhận biết khoá số hay chuỗi.
   * Trả về lỗi thay vì ném, để controller trả JSON gọn cho admin UI.
   */
  async setValue(key: string, value: string | number): Promise<SetValueResult> {
    if (!CONFIG_ALL_KEYS.includes(key)) {
      return { ok: false, errorCode: 'unknown_config_key' };
    }

    // Khoá số: bắt buộc số nguyên >= 0
    if (key in CONFIG_INT_DEFAULTS) {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        return { ok: false, errorCode: 'invalid_config_value' };
      }
      await this.repo.upsert({ key, value: String(n) }, ['key']);
      return { ok: true };
    }

    // Khoá chuỗi: cắt khoảng trắng thừa + giới hạn độ dài
    const text = String(value ?? '').trim();
    const max = CONFIG_STRING_MAX_LENGTH[key] ?? 2000;
    if (text.length > max) {
      return { ok: false, errorCode: 'config_value_too_long' };
    }
    await this.repo.upsert({ key, value: text }, ['key']);
    return { ok: true };
  }
}
