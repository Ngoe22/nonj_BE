import { Injectable } from '@nestjs/common';
import { CreatePostAnswerDto } from './dto/create-post_answer.dto.js';
import { UpdatePostAnswerDto } from './dto/update-post_answer.dto.js';

@Injectable()
export class PostAnswerService {
  create(createPostAnswerDto: CreatePostAnswerDto) {
    return 'This action adds a new postAnswer';
  }

  findAll() {
    return `This action returns all postAnswer`;
  }

  findOne(id: number) {
    return `This action returns a #${id} postAnswer`;
  }

  update(id: number, updatePostAnswerDto: UpdatePostAnswerDto) {
    return `This action updates a #${id} postAnswer`;
  }

  remove(id: number) {
    return `This action removes a #${id} postAnswer`;
  }
}
