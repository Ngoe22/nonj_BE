// _common/helper/cookie.helper.ts
import type { Response } from 'express';
import {
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    ACCESS_COOKIE_PATH,
    REFRESH_COOKIE_PATH,
    ACCESS_TOKEN_TTL_MS,
    REFRESH_TOKEN_TTL_MS,
} from '../constants/auth.constant.js';

const isProd = process.env.NODE_ENV === 'production';

const baseOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
};

export function setAccessCookie(res: Response, token: string) {
    res.cookie(ACCESS_COOKIE_NAME, token, {
        ...baseOptions,
        maxAge: ACCESS_TOKEN_TTL_MS,
        path: ACCESS_COOKIE_PATH, // '/' — gửi mọi request
    });
}

export function setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE_NAME, token, {
        ...baseOptions,
        maxAge: REFRESH_TOKEN_TTL_MS,
        path: REFRESH_COOKIE_PATH, // '/auth' — chỉ gửi tới /auth/*
    });
}

export function clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE_NAME, {
        ...baseOptions,
        path: ACCESS_COOKIE_PATH,
    });
    res.clearCookie(REFRESH_COOKIE_NAME, {
        ...baseOptions,
        path: REFRESH_COOKIE_PATH,
    });
}