import { Injectable } from '@nestjs/common';
import { FilterDbField } from '../../../_common/helper/filterQueryForRole.js';
import { GroupCollection } from '../../entities/group_collection.entity.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class GroupCollectionService {
  private filterByRoles: FilterDbField<GroupCollection>;

  constructor(
    @InjectRepository(GroupCollection)
    private  groupCollectionRepo: Repository<GroupCollection>,
  ) {
    this.filterByRoles = new FilterDbField({
      keyAndLabels: {
        id: ['founder', 'admin', 'member'],
        title: ['admin', 'admin', 'member'],
        group: ['founder', 'admin', 'member'],
      },
      dataBase: GroupCollection,
    });
  }
}