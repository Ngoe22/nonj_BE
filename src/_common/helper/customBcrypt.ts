import bcrypt from 'bcrypt';

class CustomBcrypt {
  /**
   * cost = 10 (~50–100ms/lần hash): đủ mạnh cho mật khẩu + refresh token.
   *
   * Trước đây để 1 (để đăng ký test nhanh) — bcrypt cost=1 gần như không có tác
   * dụng, kẻ xâm nhập DB brute-force được mật khẩu ngay. Chỉ áp cho hash MỚI;
   * hash cũ (cost=1) vẫn verify được vì bcrypt.compare đọc cost từ chuỗi hash,
   * nên không cần migrate — chỉ yếu cho tới khi user tự đổi mật khẩu.
   */
  static saltRounds: number = 10;

  async encode(input: string) {
    return await bcrypt.hash(input, CustomBcrypt.saltRounds);
  }

  async compare(unEncode: string, encode: string) {
    return await bcrypt.compare(unEncode, encode);
  }
}

const projectBcrypt = new CustomBcrypt();
export { projectBcrypt };
