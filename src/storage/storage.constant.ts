export const STORAGE_FOLDER = {
  QUESTION_PREPARATION_IMAGE: 'question_preparation/images',
  QUESTION_PREPARATION_AUDIO: 'question_preparation/audio',
  AVATAR: 'avatars',
  POST_IMAGE: 'post/images',
  /** Ảnh hệ thống do ADMIN upload: ảnh trang đăng nhập, favicon... */
  SYSTEM: 'system',
} as const;

export type StorageFolder =
  (typeof STORAGE_FOLDER)[keyof typeof STORAGE_FOLDER];

/** Thư mục mặc định khi client không gửi `folder` */
export const DEFAULT_FOLDER_BY_FILE_TYPE = {
  image: STORAGE_FOLDER.QUESTION_PREPARATION_IMAGE,
  audio: STORAGE_FOLDER.QUESTION_PREPARATION_AUDIO,
} as const;

// Giới hạn kích thước theo loại file
export const MAX_FILE_SIZE = {
  image: 5 * 1024 * 1024, // 5MB
  audio: 20 * 1024 * 1024, // 20MB
} as const;

// MIME types được phép
export const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'],
} as const;

// Thời hạn presigned URL (giây)
export const PRESIGNED_URL_EXPIRES = 300; // 5 phút
