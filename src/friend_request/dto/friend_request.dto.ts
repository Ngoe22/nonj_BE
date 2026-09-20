import { IsUUID } from 'class-validator';
import { UpdateRequestFromReceiverEnum, UpdateRequestFromSenderEnum } from '../enum/friend_request.enum.js';


export class UpdateRequestFromSenderDto {
  status: UpdateRequestFromSenderEnum;
}

export class UpdateRequestFromReceiverDto {
  status: UpdateRequestFromReceiverEnum;
}


// export class CreateFriendRequestDto {
//
//   @IsUUID()
//   friend_request_receiver:string;
// }

