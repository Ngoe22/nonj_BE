import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { UserGuard } from '../_other_module/guards/user.guard.js';
import { User_Role } from '../user/enums/user.enum.js';
import { R2Service } from './r2.service.js';
import { StorageRefService } from './storage_ref.service.js';
import { PresignedUploadDto } from './dto/presigned-upload.dto.js';
import  type{ RequesterInfo } from '../_common/types/request.js';
import { GetRequesterInfo } from '../_common/decorators/param/request_payload.decorator.js';
import { StorageFolder } from './storage.constant.js';



@Controller('storage')
export class StorageController {
  constructor(
    private readonly r2Service: R2Service,
    private readonly storageRef: StorageRefService,
  ) {}

  /**
   * FE xin presigned URL để upload file lên R2.
   * Sau khi upload xong, FE dùng `publicUrl` để lưu DB.
   */
  @Post('upload-url')
  async getUploadUrl(
    @Body() body: PresignedUploadDto,
    @GetRequesterInfo() requester: RequesterInfo,
  ) {
    const result = await this.r2Service.getPresignedUploadUrl({
      fileName: body.fileName,
      contentType: body.contentType,
      folder: body.folder as StorageFolder,
      fileType: body.fileType,
    });

    // Ghi nhận object NGAY khi cấp presigned URL (ref_count=0). Nếu user upload
    // xong rồi bỏ không dùng, cron sẽ dọn nó sau 7 ngày.
    await this.storageRef.recordUpload(result.key, result.publicUrl);

    return result;
  }

  /**
   * Người dùng upload ảnh/mp3 xong nhưng KHÔNG lưu (bấm huỷ / đóng form) ->
   * FE gọi endpoint này để xoá ngay các file vừa upload.
   *
   * BE CHỈ xoá object `ref_count === 0`, nên file đã được bài nào đó dùng sẽ
   * không bị mất dù FE gọi nhầm.
   */
  @Post('discard')
  async discard(@Body() body: { keys?: string[] }) {
    const deleted = await this.storageRef.discardUnused(body?.keys ?? []);
    return { deleted };
  }

  /**
   * Xoá file đã upload (nếu cần huỷ).
   *
   * CHỈ admin: trước đây bất kỳ user đã đăng nhập nào cũng xoá được MỌI object
   * trên R2 chỉ cần biết `key` (IDOR). FE hiện không dùng endpoint này — chỉ
   * giữ làm công cụ dọn rác cho admin.
   */
  @Delete()
  @UseGuards(UserGuard([User_Role.SYSTEM_ADMIN]))
  async deleteFile(@Body() body: { key: string }) {
    await this.r2Service.deleteObject(body.key);
    return { success: true };
  }
}
