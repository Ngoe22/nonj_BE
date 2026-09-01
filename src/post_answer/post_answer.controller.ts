import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PostAnswerService } from './post_answer.service.js';
import { CreatePostAnswerDto } from './dto/create-post_answer.dto.js';
import { UpdatePostAnswerDto } from './dto/update-post_answer.dto.js';

@Controller('post-answer')
export class PostAnswerController {
  constructor(private readonly postAnswerService: PostAnswerService) {}

  @Post()
  create(@Body() createPostAnswerDto: CreatePostAnswerDto) {
    return this.postAnswerService.create(createPostAnswerDto);
  }

  @Get()
  findAll() {
    return this.postAnswerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postAnswerService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePostAnswerDto: UpdatePostAnswerDto) {
    return this.postAnswerService.update(+id, updatePostAnswerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.postAnswerService.remove(+id);
  }
}
