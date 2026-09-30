import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class MarkManyReadDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  notif_ids?: string[];
}
