// _common/constants/auth.constant.ts
export const REFRESH_TOKEN_TTL_DAYS = 7;
export const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_TTL_JWT = `${REFRESH_TOKEN_TTL_DAYS}d`;

// _common/constants/auth.constant.ts
export const ACCESS_TOKEN_TTL_MINUTE = 50;
export const ACCESS_TOKEN_TTL_MS = ACCESS_TOKEN_TTL_MINUTE  * 60 * 1000;
export const ACCESS_TOKEN_TTL_JWT = `${ACCESS_TOKEN_TTL_MINUTE}m`;


// Cookie names
export const ACCESS_COOKIE_NAME = 'access_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';

// Cookie paths
export const ACCESS_COOKIE_PATH = '/';
export const REFRESH_COOKIE_PATH = '/auth';

// Quên mật khẩu (OTP)
export const FORGET_PASSWORD_OTP_LENGTH = 6;
export const FORGET_PASSWORD_OTP_TTL_MINUTES = 5;
export const FORGET_PASSWORD_OTP_TTL_MS =
  FORGET_PASSWORD_OTP_TTL_MINUTES * 60 * 1000;

/** Chặn gửi lại OTP quá nhanh: 1 phút / lần */
export const FORGET_PASSWORD_OTP_COOLDOWN_MINUTES = 1;
export const FORGET_PASSWORD_OTP_COOLDOWN_MS =
  FORGET_PASSWORD_OTP_COOLDOWN_MINUTES * 60 * 1000;

/** Độ dài mật khẩu mới do server sinh ra và gửi qua email */
export const GENERATED_PASSWORD_LENGTH = 12;




