import { User_Role } from '../../user/enums/user.enum.js';

export interface RequestToken {
  access_token?: string;
  refresh_token?: string;
}

export interface RequesterInfo {
  id: string;
  user_name: string | null;
  role: User_Role;
  jti: string;
}


export interface FriendShip {

}


declare global {
    namespace Express {
        interface Request {
          requester?: RequesterInfo;
        }
    }
}