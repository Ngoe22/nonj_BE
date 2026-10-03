// _common/helper/mail.helper.ts
import { Resend } from 'resend';

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
};

class MailHelper {
  private client: Resend | null = null;

  /**
   * Resend client được tạo LAZY ở lần gửi đầu tiên (không phải lúc import),
   * vì RESEND_API_KEY được paste vào .env sau khi server đã build/chạy.
   * Nếu key thiếu thì chỉ nổ khi thực sự gọi send → không làm chết app lúc khởi động.
   */
  private getClient(): Resend {
    if (this.client) return this.client;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey)
      throw new Error(
        'Missing RESEND_API_KEY — add it to .env ',
      );

    // RESEND_BASE_URL: chỉ dùng khi test local (trỏ về mock server). Bỏ trống = gọi api.resend.com thật
    this.client = new Resend(apiKey, {
      baseUrl: process.env.RESEND_BASE_URL,
    });
    return this.client;
  }

  private getFromAddress(): string {
    return process.env.MAIL_FROM ?? 'NONJ <onboarding@resend.dev>';
  }

  async send(input: SendMailInput) {
    const { to, subject, html } = input;

    const { data, error } = await this.getClient().emails.send({
      from: this.getFromAddress(),
      to,
      subject,
      html,
    });

    if (error)
      throw new Error(
        `Resend send mail failed [${error.name}]: ${error.message}`,
      );

    return data; // { id }
  }

  // ==================== templates ====================

  /** Gửi mã OTP để xác thực quên mật khẩu */
  async sendForgetPasswordOtpEmail(input: {
    to: string;
    otp: string;
    expired_minutes: number;
  }) {
    const { to, otp, expired_minutes } = input;

    return this.send({
      to,
      subject: '[NONJ] Mã xác thực quên mật khẩu',
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #111">
          <h2>OTP code :</h2>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0">${otp}</p>
          <p>Expire after <b>${expired_minutes} minute</b>.</p>
        </div>
      `,
    });
  }

  /** Gửi mật khẩu mới (dùng cho cả luồng OTP và luồng đổi mật khẩu khi đã đăng nhập) */
  async sendNewPasswordEmail(input: { to: string; password: string }) {
    const { to, password } = input;

    return this.send({
      to,
      subject: '[NONJ] Mật khẩu mới của bạn',
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #111">
          <h2>New password</h2>
          <p style="font-size:20px;font-weight:bold;background:#f4f4f4;padding:10px 14px;border-radius:6px;display:inline-block">${password}</p>
        </div>
      `,
    });
  }
}

const mailHelper = new MailHelper();
export { mailHelper };
export type { SendMailInput };



// <p>Hãy đăng nhập lại bằng mật khẩu này rồi đổi sang mật khẩu bạn tự nhớ.</p>
// <p>Toàn bộ phiên đăng nhập trên các thiết bị khác đã bị đăng xuất.</p>
// <p>Nếu bạn không yêu cầu, hãy đổi mật khẩu ngay.</p>