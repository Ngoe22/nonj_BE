import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import {
  ALLOWED_MIME_TYPES,
  DEFAULT_FOLDER_BY_FILE_TYPE,
  MAX_FILE_SIZE,
  PRESIGNED_URL_EXPIRES,
  STORAGE_FOLDER,
  type StorageFolder,
} from './storage.constant.js';

interface PresignedUploadInput {
  fileName: string;
  contentType: string;
  /** Bỏ trống thì suy ra từ `fileType` */
  folder?: StorageFolder | string;
  fileType: 'image' | 'audio';
}

export interface PresignedUploadOutput {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresAt: string;
  maxSize: number;
}

@Injectable()
export class R2Service {
  private client: S3Client | null = null;
  private bucket = '';
  private publicUrlBase = '';

  constructor(private readonly config: ConfigService) {}


  private getClient(): { s3: S3Client; bucket: string; publicUrlBase: string } {
    if (this.client) {
      return {
        s3: this.client,
        bucket: this.bucket,
        publicUrlBase: this.publicUrlBase,
      };
    }

    const bucketName = this.config.get<string>('r2.bucketName');
    const publicUrl = this.config.get<string>('r2.publicUrl');
    const endpoint = this.config.get<string>('r2.endpoint');
    const accessKeyId = this.config.get<string>('r2.accessKeyId');
    const secretAccessKey = this.config.get<string>('r2.secretAccessKey');

    const missing = Object.entries({
      R2_BUCKET_NAME: bucketName,
      R2_PUBLIC_URL: publicUrl,
      R2_ENDPOINT: endpoint,
      R2_ACCESS_KEY_ID: accessKeyId,
      R2_SECRET_ACCESS_KEY: secretAccessKey,
    })
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new ServiceUnavailableException({
        errorCode: 'storage_not_configured',
        missing,
      });
    }

    this.bucket = bucketName!;
    this.publicUrlBase = publicUrl!.replace(/\/$/, '');

    this.client = new S3Client({
      region: 'auto',
      endpoint: endpoint!,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });

    return {
      s3: this.client,
      bucket: this.bucket,
      publicUrlBase: this.publicUrlBase,
    };
  }


  getPublicUrlBase(): string {
    return (this.config.get<string>('r2.publicUrl') ?? '').replace(/\/$/, '');
  }

  // ============================================================
  // PRESIGNED UPLOAD
  // ============================================================
  async getPresignedUploadUrl(
    input: PresignedUploadInput,
  ): Promise<PresignedUploadOutput> {
    const { fileName, contentType, folder, fileType } = input;
    const { s3, bucket, publicUrlBase } = this.getClient();

    // 1. Validate MIME type
    const allowed = ALLOWED_MIME_TYPES[fileType] as readonly string[];
    if (!allowed.includes(contentType)) {
      throw new BadRequestException({
        errorCode: 'invalid_file_type',
        allowed,
      });
    }

    // 1b. Thư mục — client có thể bỏ trống, mặc định theo loại file
    const resolvedFolder = (folder ??
      DEFAULT_FOLDER_BY_FILE_TYPE[fileType]) as StorageFolder;
    if (!Object.values(STORAGE_FOLDER).includes(resolvedFolder)) {
      throw new BadRequestException({ errorCode: 'invalid_folder' });
    }

    // 2. Tạo key duy nhất — tránh ghi đè
    const ext =
      extname(fileName).toLowerCase() || this.getExtFromMime(contentType);
    const key = `${resolvedFolder}/${randomUUID()}${ext}`;

    // 3. Tạo presigned URL
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRES,
    });

    // 4. Build response
    const expiresAt = new Date(
      Date.now() + PRESIGNED_URL_EXPIRES * 1000,
    ).toISOString();

    return {
      uploadUrl,
      publicUrl: `${publicUrlBase}/${key}`,
      key,
      expiresAt,
      maxSize: MAX_FILE_SIZE[fileType],
    };
  }

  // ============================================================
  // DELETE
  // ============================================================
  async deleteObject(key: string): Promise<void> {
    const { s3, bucket } = this.getClient();

    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (!keys.length) return;

    const { s3, bucket } = this.getClient();

    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }

  // ============================================================
  // HELPERS
  // ============================================================
  private getExtFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
    };
    return map[mime] ?? '';
  }
}
