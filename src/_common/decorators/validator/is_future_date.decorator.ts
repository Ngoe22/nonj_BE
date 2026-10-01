import {
  registerDecorator,
  type ValidationOptions,
} from 'class-validator';

/**
 * Hạn chót phải ở TƯƠNG LAI.
 *
 * Đặt hạn trong quá khứ làm hai logic xung đột ngay từ lúc lưu: bài vừa tạo đã
 * bị coi là "quá hạn", nên không thể làm bài mà cũng không thể làm lại.
 *
 * Chỉ dùng cho lúc TẠO. Lúc SỬA phải kiểm tra ở service, vì sửa tiêu đề của một
 * bài đã hết hạn vẫn gửi kèm hạn cũ — trường hợp đó phải cho qua.
 */
export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          // bỏ trống = không đặt hạn = hợp lệ
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
