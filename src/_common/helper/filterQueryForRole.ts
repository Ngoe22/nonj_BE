import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

type Input<T extends ObjectLiteral> = {
  keyAndLabels: Record<string, string[]>;
  dataBase: EntityTarget<T>;
  dataSource: DataSource;
};

export class FilterDbField<T extends ObjectLiteral> {

  private readonly keyAndLabels: Record<string, Set<string>>;

  constructor(input: Input<T>) {
    this.keyAndLabels = this.createSets(input); //object { key : set[ role1 ,role2 ] }
  }

  private createSets(input: Input<T>): Record<string, Set<string>> {
    const { keyAndLabels, dataBase, dataSource } = input;
    const columns = new Set(
      dataSource.getMetadata(dataBase).columns.map((col) => col.propertyName),
    );
    return Object.fromEntries(
      Object.entries(keyAndLabels).map(([key, labels]) => {
        if (!columns.has(key))
          throw new Error(
            'server : FilterDbField created fail -  input key not in database column.' +
              key,
          );
        return [key, new Set<string>(labels)];
      }),
    );
  }

  // =====================================================

  getQuerySelectArray(input: { label: string; tableName: string }) {
    const array: string[] = [];
    const { label, tableName } = input;

    Object.entries(this.keyAndLabels).forEach(([field, labels]) => {
      if (labels.has(label)) array.push(`${tableName}.${field} AS ${field}`);
    });

    return array;
  }

  filterDataOfQueryResult(input: {
    object: Record<string, any>;
    label: string;
  }) {
    const { object, label } = input; // label === role
    const output = {} as Record<string, any>;

    Object.entries(object).forEach(([field, value]) => {
      if (this.keyAndLabels[field]?.has(label)) output[field] = value;
    });

    return output;
  }
}