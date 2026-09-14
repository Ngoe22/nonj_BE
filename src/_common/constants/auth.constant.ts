// _common/constants/auth.constant.ts
export const REFRESH_TOKEN_TTL_DAYS = 7;
export const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_TTL_JWT = `${REFRESH_TOKEN_TTL_DAYS}d`;   // dùng cho jwtService.sign expiresIn

// _common/constants/auth.constant.ts
export const ACCESS_TOKEN_TTL_MINUTE = 50;
export const ACCESS_TOKEN_TTL_MS = ACCESS_TOKEN_TTL_MINUTE  * 60 * 1000;
export const ACCESS_TOKEN_TTL_JWT = `${ACCESS_TOKEN_TTL_MINUTE}m`;   // dùng cho jwtService.sign expiresIn