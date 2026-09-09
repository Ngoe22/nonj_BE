import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

type Input<T extends ObjectLiteral> = {
  keyAndLabels: Record<string, string[]>;
  dataBase: EntityTarget<T>;
  dataSource: DataSource;
};

export class FilterDbField<T extends ObjectLiteral> {
  private readonly keyAndLabels: Record<string, Set<string>>;

  constructor(input: Input<T>) {
    this.keyAndLabels = this.createSetsOfKeyAndLabels(input); //object { key : set[ role1 ,role2 ] }
  }

  static turnObjInfoToRelationObj(
    object: Record<string, any>,
    relationFields: string[],
  ) {
    // input = {
    //   title : 'abc'
    //   date : "bla bla"
    //   user : '@3123'
    // }
    // // relation array field = [ 'user ]
    // output = {
    //   title : 'abc'
    //   date : "bla bla"
    //   user : { id : '@3123' }
    // }

    const output = {} as Record<string, any>;
    const sets = new Set(relationFields);

    Object.entries(object).forEach(([key, value]) => {
      output[key] = sets.has(key) ? { id: value } : value;
    });

    return output;
  }

  // =====================================================

  buildQuerySelectArray(input: { label: string; tableName: string }) {
    const array: string[] = [];
    const { label, tableName } = input;

    Object.entries(this.keyAndLabels).forEach(([field, labels]) => {
      if (labels.has(label)) array.push(`${tableName}.${field} AS ${field}`);
    });

    return array;
  }

  buildQuerySelectObject(input: { label: string }) {
    const object: Record<string, boolean> = {};
    const { label } = input;

    Object.entries(this.keyAndLabels).forEach(([field, labels]) => {
      if (labels.has(label)) object[field] = true;
    });

    return object;
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

  // =====================================================

  private createSetsOfKeyAndLabels(
    input: Input<T>,
  ): Record<string, Set<string>> {
    const { keyAndLabels, dataBase, dataSource } = input;
    const columns = new Set(
      dataSource.getMetadata(dataBase).columns.map((col) => col.propertyName),
    );
    return Object.fromEntries(
      Object.entries(keyAndLabels).map(([key, labels]) => {
        if (!columns.has(key))
          throw new Error(
            `server : FilterDbField created fail -  input key ( ${key} ) not in database column.`,
          );
        return [key, new Set<string>(labels)];
      }),
    );
  }
}