import { IsEnum } from 'class-validator';
import { UpdateRequestFromReceiverEnum, UpdateRequestFromSenderEnum } from '../enum/friend_request.enum.js';


export class UpdateRequestFromSenderDto {
  @IsEnum(UpdateRequestFromSenderEnum)
  status: UpdateRequestFromSenderEnum;
}

export class UpdateRequestFromReceiverDto {
  @IsEnum(UpdateRequestFromReceiverEnum)
  status: UpdateRequestFromReceiverEnum;
}


// export class CreateFriendRequestDto {
//
//   @IsUUID()
//   friend_request_receiver:string;
// }

