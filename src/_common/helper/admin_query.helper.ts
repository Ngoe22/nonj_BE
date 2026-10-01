import {
  Between,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Raw,
  FindOperator,
} from 'typeorm';

/** Kết quả phân trang thống nhất cho mọi màn admin */
export interface AdminPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Điều kiện cho `created_at`.
 *
 * Trả `undefined` khi không lọc — TypeORM bỏ qua field có giá trị undefined,
 * nên cứ đưa thẳng vào `where` là được.
 */
export function adminCreatedRange(query: {
  created_from?: string;
  created_to?: string;
}): FindOperator<Date> | undefined {
  const from = query.created_from ? new Date(query.created_from) : undefined;
  const to = query.created_to ? new Date(query.created_to) : undefined;

  if (from && to) return Between(from, to);
  if (from) return MoreThanOrEqual(from);
  if (to) return LessThanOrEqual(to);
  return undefined;
}

/** LIKE không phân biệt hoa thường; chuỗi rỗng/khoảng trắng -> không lọc */
export function adminLike(value?: string): FindOperator<string> | undefined {
  const trimmed = value?.trim();
  return trimmed ? ILike(`%${trimmed}%`) : undefined;
}

/** So khớp CHÍNH XÁC (dùng cho id, slug, enum) */
export function adminExact(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Gói kết quả phân trang */
export function adminPage<T>(input: {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
}): AdminPage<T> {
  return {
    items: input.items,
    total: input.total,
    page: input.page ?? 1,
    limit: input.limit ?? 20,
  };
}

/**
 * Thêm cờ trạng thái xoá mềm.
 *
 * `deleted_at` phải có trong `select` thì cờ này mới đúng — xem `deleted_at`
 * trong `fieldAndLabels` của từng module.
 */
export function markDeleted<T extends { deleted_at?: Date | null }>(
  item: T,
): T & { is_deleted: boolean } {
  return { ...item, is_deleted: !!item.deleted_at };
}

/**
 * Bỏ các khoá có giá trị `undefined` khỏi mệnh đề `where`.
 *
 * TypeORM bản này (1.1.0) mặc định **NÉM LỖI** khi `where` chứa `undefined`,
 * khác upstream vốn lặng lẽ bỏ qua. Giữ nguyên mặc định đó là CÓ LÝ vì nó chặn
 * được lỗi rất nguy hiểm: ở upstream, `where: { id: undefined }` sẽ trả về
 * TOÀN BỘ bản ghi — đúng kiểu lỗi làm rò dữ liệu ở màn quản trị.
 *
 * Nên thay vì tắt cảnh báo toàn cục, ta tự dọn `where` trước khi truyền vào.
 * Hàm xử lý được cả mảng `where` (TypeORM hiểu mảng là OR).
 */
export function adminWhere<T extends Record<string, unknown>>(
  where: T | T[],
): T | T[] {
  if (Array.isArray(where)) {
    return where.map((item) => adminWhere(item)) as T[];
  }

  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    // `FindOperator` (Like/Between/MoreThan…) là object nhưng KHÔNG được đệ quy
    const isPlainObject =
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof FindOperator);

    if (isPlainObject) {
      const nested = adminWhere(value as Record<string, unknown>) as Record<
        string,
        unknown
      >;
      // object rỗng thì bỏ luôn, tránh tạo điều kiện vô nghĩa
      if (Object.keys(nested).length > 0) output[key] = nested;
      continue;
    }

    output[key] = value;
  }

  return output as T;
}

/**
 * LIKE cho cột **UUID** (id, group_id, collection_id…).
 *
 * KHÔNG dùng `ILike` trực tiếp được: Postgres báo
 * `operator does not exist: uuid ~~* unknown` vì `uuid` không có toán tử ILIKE.
 * Phải CAST cột sang text trước rồi mới so khớp một phần.
 */
let uuidLikeSeq = 0;

export function adminUuidLike(
  value?: string,
): FindOperator<string> | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  // Tên tham số PHẢI unique cho mỗi lần gọi. Nếu dùng cố định `:admin_uuid_like`
  // thì khi một query lọc HAI cột uuid cùng lúc (vd bài tập: group_id +
  // collection_id), tham số sau sẽ GHI ĐÈ tham số trước -> cả hai điều kiện
  // cùng so với MỘT giá trị -> ra 0 kết quả. Dùng bộ đếm tăng dần cho khỏi đụng.
  const param = `admin_uuid_like_${uuidLikeSeq++}`;

  return Raw((alias: string) => `CAST(${alias} AS TEXT) ILIKE :${param}`, {
    [param]: `%${trimmed}%`,
  });
}
