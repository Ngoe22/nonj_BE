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




