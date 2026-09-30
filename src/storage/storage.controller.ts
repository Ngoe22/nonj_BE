import { Controller, Post, Body, Delete, Param } from '@nestjs/common';
import { R2Service } from './r2.service.js';
import { PresignedUploadDto } from './dto/presigned-upload.dto.js';
import  type{ RequesterInfo } from '../_common/types/request.js';
import { GetRequesterInfo } from '../_common/decorators/param/request_payload.decorator.js';
import { StorageFolder } from './storage.constant.js';



@Controller('storage')
export class StorageController {
  constructor(private readonly r2Service: R2Service) {}

  /**
   * FE xin presigned URL để upload file lên R2.
   * Sau khi upload xong, FE dùng `publicUrl` để lưu DB.
   */
  @Post('upload-url')
  async getUploadUrl(
    @Body() body: PresignedUploadDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    return this.r2Service.getPresignedUploadUrl({
      fileName: body.fileName,
      contentType: body.contentType,
      folder: body.folder as StorageFolder,
      fileType: body.fileType,
    });
  }

  /**
   * Xoá file đã upload (nếu cần huỷ).
   */
  @Delete()
  async deleteFile(@Body() body: { key: string }) {
    await this.r2Service.deleteObject(body.key);
    return { success: true };
  }
}
