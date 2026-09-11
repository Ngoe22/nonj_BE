import { Injectable } from '@nestjs/common';
import { FilterDbField } from '../../../_common/helper/filterQueryForRole.js';
import { ObjectLiteral, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class GroupService {
  private filterByRoles: FilterDbField<GroupService>;

  constructor(
    @InjectRepository(GroupService)
    private groupRepo: Repository<GroupService>,
  ) {
    this.filterByRoles = new FilterDbField({
      keyAndLabels: {
        id: ['founder', 'admin', 'member', 'not_member'],
        founder: ['founder', 'admin', 'member', 'not_member'],
        slug: ['founder', 'admin', 'member', 'not_member'],
        name: ['founder', 'admin', 'member', 'not_member'],
        description: ['founder', 'admin', 'member', 'not_member'],
        join_mode: ['founder', 'admin'],
        view_mode: ['founder', 'admin'],
        create_at: ['founder', 'admin'],
      },
      dataBase: GroupService,
    });
  }
}

