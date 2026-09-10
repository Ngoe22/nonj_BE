import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCollectionDto {
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    title: string;
}

export class UpdateCollectionDto {
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    title: string;
}