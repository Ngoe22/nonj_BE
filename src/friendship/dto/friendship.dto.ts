import {IsUUID} from "class-validator";

export class CreateFriendshipDto {

    @IsUUID()
    user_id : string

    @IsUUID()
    user_friend_id : string

    @IsUUID()
    source_request_id  : string

}
