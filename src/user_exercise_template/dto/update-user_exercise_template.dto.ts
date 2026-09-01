import { PartialType } from '@nestjs/mapped-types';
import { CreateUserExerciseTemplateDto } from './create-user_exercise_template.dto.js';

export class UpdateUserExerciseTemplateDto extends PartialType(CreateUserExerciseTemplateDto) {}
