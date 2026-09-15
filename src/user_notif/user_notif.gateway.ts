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

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      const payload = this.jwtService.verify(token);

      client.join(`user:${payload.id}`);
      client.data.user_id = payload.id;
    } catch (err:any) {
      this.logger.warn(`Connect fail: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
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
