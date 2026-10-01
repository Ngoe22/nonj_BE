import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { TokenService } from '../refresh_token/refresh_token.service.js';
import { ACCESS_COOKIE_NAME } from '../_common/constants/auth.constant.js';
import { isOriginAllowed } from '../_common/helper/cors.helper.js';
import { User_Role } from '../user/enums/user.enum.js';

/**
 * Gateway thông báo realtime.
 *
 * XÁC THỰC BẰNG COOKIE, không phải token trong JS:
 * `access_token` là cookie HttpOnly nên FE KHÔNG đọc được để nhét vào
 * `handshake.auth` (cách cũ luôn thất bại). Trình duyệt tự gửi cookie kèm
 * handshake (same-site), BE đọc lại và validate qua TokenService — đúng cùng
 * một đường đi với AccessTokenGuard của HTTP.
 *
 * Cách cũ còn sai ở chỗ dùng `process.env.JWT_SECRET` trong khi .env chỉ có
 * `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` -> secret undefined -> verify ném
 * lỗi -> mọi kết nối bị ngắt ngay.
 */
/** Phòng chỉ SYSTEM_ADMIN vào — dùng để phát số người đang online */
const ADMIN_ROOM = 'admin';

@WebSocketGateway({
  namespace: 'notif',
  cors: {
    // Dạng callback: decorator chạy TRƯỚC khi dotenv nạp .env, nên nếu đọc
    // process.env.FE_URL ở đây sẽ luôn undefined.
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => callback(null, isOriginAllowed(requestOrigin)),
    credentials: true,
  },
})
export class NotifGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotifGateway.name);

  /**
   * userId -> số kết nối đang mở.
   *
   * Đếm theo USER chứ không theo socket: mở 3 tab vẫn là 1 người online.
   */
  private readonly online = new Map<string, number>();

  constructor(private readonly tokenService: TokenService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractAccessToken(client);
      if (!token) throw new Error('missing_access_token');

      const requester = await this.tokenService.validateToken(token, 'access');

      client.join(`user:${requester.id}`);
      client.data.user_id = requester.id;

      this.online.set(requester.id, (this.online.get(requester.id) ?? 0) + 1);

      // SYSTEM_ADMIN vào thêm phòng 'admin' để nhận số người online
      const role = String(requester.role ?? '').toUpperCase();
      if (role === User_Role.SYSTEM_ADMIN) client.join(ADMIN_ROOM);

      this.broadcastOnlineCount();

      this.logger.log(`WS connected: user=${requester.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`WS connect rejected: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user_id = client.data?.user_id;
    if (!user_id) return;

    const left = (this.online.get(user_id) ?? 1) - 1;
    if (left > 0) this.online.set(user_id, left);
    else this.online.delete(user_id);

    this.broadcastOnlineCount();

    this.logger.log(`WS disconnected: user=${user_id}`);
  }

  /** Số người đang online (đếm theo user, không theo tab) */
  getOnlineCount(): { total: number } {
    return { total: this.online.size };
  }

  private broadcastOnlineCount() {
    if (!this.server) return;
    // chỉ admin nhận — người dùng thường không cần biết
    this.server.to(ADMIN_ROOM).emit('online_count', this.getOnlineCount());
  }

  /** Parse thủ công để không kéo thêm dependency cookie-parser vào gateway */
  private extractAccessToken(client: Socket): string | undefined {
    const raw = client.handshake.headers?.cookie;
    if (!raw) return undefined;

    for (const part of raw.split(';')) {
      const separator = part.indexOf('=');
      if (separator === -1) continue;

      const name = part.slice(0, separator).trim();
      if (name !== ACCESS_COOKIE_NAME) continue;

      return decodeURIComponent(part.slice(separator + 1).trim());
    }

    return undefined;
  }

  emitToUser(user_id: string, event: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(`user:${user_id}`).emit(event, payload);
  }
}
