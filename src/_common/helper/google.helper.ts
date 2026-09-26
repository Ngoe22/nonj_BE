// _common/helper/google.helper.ts
import { UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

/** Thông tin tối thiểu lấy ra từ ID token của Google */
type GoogleProfile = {
  google_id: string;
  email: string;
  nickname?: string;
  avatar_url?: string;
};

class GoogleHelper {
  private client: OAuth2Client | null = null;

  private getClientId(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId)
      throw new Error(
        'Missing GOOGLE_CLIENT_ID — thêm biến này vào .env rồi restart server',
      );
    return clientId;
  }

  private getClient(): OAuth2Client {
    if (this.client) return this.client;
    this.client = new OAuth2Client(this.getClientId());
    return this.client;
  }

  /**
   * Xác thực ID token (credential) do Google Identity Services trả về ở FE.
   *
   * - `audience = GOOGLE_CLIENT_ID` → chặn token phát cho app khác.
   * - Bắt buộc `email_verified` vì ta dùng email để liên kết tài khoản cũ.
   */
  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    let payload;

    try {
      const ticket = await this.getClient().verifyIdToken({
        idToken,
        audience: this.getClientId(),
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException({ errorCode: 'google_token_invalid' });
    }

    if (!payload?.sub || !payload.email)
      throw new UnauthorizedException({ errorCode: 'google_token_invalid' });

    if (!payload.email_verified)
      throw new UnauthorizedException({
        errorCode: 'google_email_not_verified',
      });

    return {
      google_id: payload.sub,
      email: payload.email,
      nickname: payload.name,
      avatar_url: payload.picture,
    };
  }
}

const googleHelper = new GoogleHelper();
export { googleHelper };
export type { GoogleProfile };
