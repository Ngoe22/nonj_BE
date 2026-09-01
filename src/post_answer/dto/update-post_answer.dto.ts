import { PartialType } from '@nestjs/mapped-types';
import { CreatePostAnswerDto } from './create-post_answer.dto.js';

export class UpdatePostAnswerDto extends PartialType(CreatePostAnswerDto) {}
