import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateCollectionDto {
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    title: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    desc?: string;
}

export class UpdateCollectionDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    title?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    desc?: string;
}