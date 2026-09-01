import { PartialType } from '@nestjs/mapped-types';
import { CreateRefreshTokenDto } from './create-refresh_token.dto.js';

export class UpdateRefreshTokenDto extends PartialType(CreateRefreshTokenDto) {}
