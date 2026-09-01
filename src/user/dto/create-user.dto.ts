import {IsString, MinLength} from "class-validator";

export class CreateUserDto {

    @IsString( )
    @MinLength(1 )
    nickname : string;

    @IsString()
    @MinLength(1  )
    user_name : string;

    @IsString(  )
    @MinLength(6 )
    password: string;

    @IsString()
    email: string

}
