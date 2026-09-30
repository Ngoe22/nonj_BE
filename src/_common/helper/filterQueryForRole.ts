import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

type Input<T extends ObjectLiteral, L extends string> = {
  labels: readonly L[];
  fieldAndLabels: Record<string, L[] | Record<string, L[]>>;
  dataBases: {
    _main: EntityTarget<T>;
    [key: string]: EntityTarget<T>;
  };
  dataSource: DataSource;
  FE_permission?: Record<string, L[]>;
};

export class FilterDbField<T extends ObjectLiteral, L extends string> {
  private readonly labels: readonly L[];
  private readonly keyAndLabels: Record<
    string,
    Set<L> | Record<string, Set<L>>
  >;
  private readonly permission?: Record<string, Set<L>>;

  private constructor(input: Input<T, L>) {
    this.labels = input.labels;
    this.keyAndLabels = this.createSetsOfKeyAndLabels(input);

    if (input.FE_permission) {
      this.permission = this.createPermission(input.FE_permission);
    }
  }

  // Factory function — nơi "const L" phát huy tác dụng suy luận literal type
  static create<T extends ObjectLiteral, const L extends string>(
    input: Input<T, L>,
  ): FilterDbField<T, L> {
    return new FilterDbField<T, L>(input);
  }

  private createPermission(input: Record<string, L[]>): Record<string, Set<L>> {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, new Set(value)]),
    );
  }

  private createSetsOfKeyAndLabels(
    input: Input<T, L>,
  ): Record<string, Set<L> | Record<string, Set<L>>> {
    const { fieldAndLabels, dataBases, dataSource } = input;

    const AllDbColumns = Object.fromEntries(
      Object.entries(dataBases).map(([key, dataBase]) => [
        key,
        new Set(
          dataSource
            .getMetadata(dataBase)
            .columns.map((col) => col.propertyName),
        ),
      ]),
    );

    return Object.fromEntries(
      Object.entries(fieldAndLabels).map(([mainKey, mainLabels]) => {
        if (Array.isArray(mainLabels)) {
          if (!AllDbColumns._main.has(mainKey)) {
            throw new Error(
              `server: FilterDbField created fail - input key (${mainKey}) not in database column.`,
            );
          }
          return [mainKey, new Set(mainLabels)];
        }

        const relation = Object.fromEntries(
          Object.entries(mainLabels).map(([relationKey, relationLabels]) => {
            if (!AllDbColumns[mainKey]?.has(relationKey)) {
              throw new Error(
                `server: FilterDbField created fail - ${mainKey} relation key (${relationKey}) not in database column.`,
              );
            }
            return [relationKey, new Set(relationLabels)];
          }),
        );
        return [mainKey, relation];
      }),
    );
  }


  // public

  getLabelPermission(label: L): Record<string, boolean> {
    if (!this.permission) return {};
    const output: Record<string, boolean> = {};
    Object.entries(this.permission).forEach(([key, labels]) => {
      output[key] = labels.has(label);
    });
    return output;
  }

  buildQueryObject(input: { label: L }) {
    const select: Record<string, any> = {};
    const relations: Record<string, boolean> = {};
    const { label } = input;

    Object.entries(this.keyAndLabels).forEach(([field, value]) => {
      if (value instanceof Set) {
        // Column thường
        if (value.has(label)) select[field] = true;
      } else {
        // Relation
        const relationSelect: Record<string, boolean> = {};

        Object.entries(value).forEach(([relationKey, relationSet]) => {
          if ((relationSet as Set<string>).has(label)) {
            relationSelect[relationKey] = true;
          }
        });

        if (Object.keys(relationSelect).length > 0) {
          select[field] = relationSelect;
          relations[field] = true;
        }
      }
    });

    const permission = this.getLabelPermission(label);
    return { select, relations, permission };
  }


  filterDataOfQueryResult(input: {
    object: Record<string, any>;
    label: L;
  }): Record<string, any> {
    const { object, label } = input;
    const output: Record<string, any> = {};

    Object.entries(object).forEach(([field, value]) => {
      const fieldLabels = this.keyAndLabels[field];
      if (!fieldLabels) return;

      // ============ Floor 1 — column ============
      if (fieldLabels instanceof Set) {
        if (fieldLabels.has(label)) output[field] = value;
        return;
      }

      // ============ Floor 2 — relation ============
      if (!value) return; // null / undefined

      // Helper: filter 1 object theo config relation
      const filterRelationItem = (item: Record<string, any>) => {
        const nested: Record<string, any> = {};
        Object.entries(item).forEach(([relationField, relationValue]) => {
          const relationLabels = fieldLabels[relationField];
          if (relationLabels?.has(label)) {
            nested[relationField] = relationValue;
          }
        });
        return nested;
      };

      // Case A: relation là MẢNG (OneToMany / ManyToMany)
      if (Array.isArray(value)) {
        const filtered = value
            .map((item) =>
                item && typeof item === 'object' ? filterRelationItem(item) : null,
            )
            .filter((item): item is Record<string, any> => item !== null);

        // Giữ array rỗng hay bỏ? — tuỳ bạn. Ở đây giữ nếu có phần tử.
        if (filtered.length > 0) output[field] = filtered;
        return;
      }

      // Case B: relation là OBJECT (ManyToOne / OneToOne)
      if (typeof value === 'object') {
        const nested = filterRelationItem(value);
        if (Object.keys(nested).length > 0) {
          output[field] = nested;
        }
      }
    });

    return output;
  }

  // ================================
  // STATIC

  static turnObjInfoToRelationObjToSave(
    object: Record<string, any>,
    keys: string[],
  ) {
    keys.forEach((key) => {
      if( object[key] ) object[key] = { id: object[key] };
    });
    return object;
  }
}


