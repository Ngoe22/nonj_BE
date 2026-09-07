
export interface RequestToken {
  access_token?: string;
  refresh_token?: string;
}

export interface JwtPayload {
    id: string;
    user_name: string;
    role: string;
    jti: string;
}



declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}