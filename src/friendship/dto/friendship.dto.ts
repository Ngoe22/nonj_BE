import {IsUUID} from "class-validator";

export class CreateFriendshipDto {

    @IsUUID()
    user_id : string

    @IsUUID()
    friend_id : string

    @IsUUID()
    source_request  : string

}

export class AdminUpdateFriendshipDto {

    @IsUUID()
    user_id : string

    @IsUUID()
    friend_id : string

    @IsUUID()
    source_request  ?: string

}
