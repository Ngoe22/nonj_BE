import {
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';


export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          // bỏ trống = không đặt hạn = pass
          if (value === null || value === undefined || value === '') return true;
          if (typeof value !== 'string') return false;

          const time = new Date(value).getTime();
          if (Number.isNaN(time)) return false;

          return time > Date.now();
        },
        defaultMessage() {
          return 'deadline_must_be_future';
        },
      },
    });
  };
}
