import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseLimitPipe implements PipeTransform {
  transform(value: string): number {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 100) {
      throw new BadRequestException('limit must be a number between 1 and 100');
    }
    return num;
  }
}
