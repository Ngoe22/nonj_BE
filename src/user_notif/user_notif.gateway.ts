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
@WebSocketGateway({
  namespace: 'notif',
  cors: {
    origin: process.env.FE_URL,
    credentials: true,
  },
})
export class NotifGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotifGateway.name);

  constructor(private readonly tokenService: TokenService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractAccessToken(client);
      if (!token) throw new Error('missing_access_token');

      const requester = await this.tokenService.validateToken(token, 'access');

      client.join(`user:${requester.id}`);
      client.data.user_id = requester.id;

      this.logger.log(`WS connected: user=${requester.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`WS connect rejected: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user_id = client.data?.user_id;
    if (user_id) this.logger.log(`WS disconnected: user=${user_id}`);
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
