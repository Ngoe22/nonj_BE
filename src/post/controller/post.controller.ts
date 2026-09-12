import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PostService } from '../post.service.js';

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}


}
