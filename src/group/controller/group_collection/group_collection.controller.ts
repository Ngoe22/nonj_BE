import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { GroupService } from '../../service/group/group.service.js';

@Controller('group_collection')
export class GroupCollectionController {
  constructor(private readonly groupService: GroupService) {}
}
