import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserExerciseTemplateService } from './user_exercise_template.service.js';
import { CreateUserExerciseTemplateDto } from './dto/create-user_exercise_template.dto.js';
import { UpdateUserExerciseTemplateDto } from './dto/update-user_exercise_template.dto.js';

@Controller('user-exercise-template')
export class UserExerciseTemplateController {
  constructor(private readonly userExerciseTemplateService: UserExerciseTemplateService) {}

  @Post()
  create(@Body() createUserExerciseTemplateDto: CreateUserExerciseTemplateDto) {
    return this.userExerciseTemplateService.create(createUserExerciseTemplateDto);
  }

  @Get()
  findAll() {
    return this.userExerciseTemplateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userExerciseTemplateService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserExerciseTemplateDto: UpdateUserExerciseTemplateDto) {
    return this.userExerciseTemplateService.update(+id, updateUserExerciseTemplateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userExerciseTemplateService.remove(+id);
  }
}
