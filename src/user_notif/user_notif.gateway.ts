// notif.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'notif',
})
export class NotifGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotifGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  // Chạy mỗi khi 1 client kết nối tới
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      const payload = this.jwtService.verify(token); // dùng cùng secret với JWT của REST API

      // mỗi user join vào 1 "room" riêng theo user_id — để emit đúng người, không broadcast toàn bộ
      client.join(`user:${payload.id}`);
      client.data.user_id = payload.id;
    } catch (err:any) {
      this.logger.warn(`Kết nối bị từ chối: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // socket.io tự dọn room khi disconnect, không cần code thêm
  }

  private extractToken(client: Socket): string {
    // FE gửi token qua auth handshake
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1];
    if (!token) throw new Error('missing_token');
    return token;
  }

  emitToUser(user_id: string, event: string, payload: any) {
    this.server.to(`user:${user_id}`).emit(event, payload);
  }
}
