import { IsString, MinLength, MaxLength } from 'class-validator';
import {Optional} from "@nestjs/common";

export class CreateCollectionDto {
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    title: string;

    @Optional()
    @IsString()
    @MaxLength(100)
    desc: string;
}

export class UpdateCollectionDto {
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    title: string;

    @Optional()
    @IsString()
    @MaxLength(100)
    desc: string;
}