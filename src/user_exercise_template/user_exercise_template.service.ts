import { Injectable } from '@nestjs/common';
import { CreateUserExerciseTemplateDto } from './dto/create-user_exercise_template.dto.js';
import { UpdateUserExerciseTemplateDto } from './dto/update-user_exercise_template.dto.js';

@Injectable()
export class UserExerciseTemplateService {
  create(createUserExerciseTemplateDto: CreateUserExerciseTemplateDto) {
    return 'This action adds a new userExerciseTemplate';
  }

  findAll() {
    return `This action returns all userExerciseTemplate`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userExerciseTemplate`;
  }

  update(id: number, updateUserExerciseTemplateDto: UpdateUserExerciseTemplateDto) {
    return `This action updates a #${id} userExerciseTemplate`;
  }

  remove(id: number) {
    return `This action removes a #${id} userExerciseTemplate`;
  }
}
