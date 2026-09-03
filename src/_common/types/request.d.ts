// declare module 'express' {
//     interface Request {
//         payload?: {
//             id :string ,
//             user_name :string ,
//             role_name :string ,
//         }
//     }
// }

export interface JwtPayload {
    id: string;
    user_name: string;
    role: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}