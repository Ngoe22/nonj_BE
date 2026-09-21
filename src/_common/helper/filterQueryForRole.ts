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

  getLabelPermission(label: L): Record<string, boolean> {
    if (!this.permission) return {};

    const output: Record<string, boolean> = {};
    Object.entries(this.permission).forEach(([key, labels]) => {
      if (labels.has(label)) output[key] = true;
    });
    return output;
  }

  buildQueryObject(input: { label: L }) {
    const select: Record<string, boolean> = {};
    const relations: Record<string, boolean | Record<string, boolean>> = {};
    const { label } = input;

    Object.entries(this.keyAndLabels).forEach(([field, value]) => {
      if (value instanceof Set) {
        if (value.has(label)) select[field] = true;
      } else {
        const relationQueries: Record<string, boolean> = {};
        Object.entries(value).forEach(([relationKey, relationSet]) => {
          if (relationSet.has(label)) relationQueries[relationKey] = true;
        });
        if (Object.keys(relationQueries).length > 0) {
          relations[field] = relationQueries;
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

      if (fieldLabels instanceof Set) {
        // Floor 1  — field
        if (fieldLabels.has(label)) output[field] = value;
      } else {
        // Floor 2 —  relation (object)
        if (value && typeof value === 'object') {
          const nestedOutput: Record<string, any> = {};
          Object.entries(value).forEach(([relationField, relationValue]) => {
            const relationLabels = fieldLabels[relationField];
            if (relationLabels?.has(label)) {
              nestedOutput[relationField] = relationValue;
            }
          });
          if (Object.keys(nestedOutput).length > 0) {
            output[field] = nestedOutput;
          }
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



















// import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
// import { InjectDataSource } from '@nestjs/typeorm';
//
// type Input<T extends ObjectLiteral> = {
//   labels: readonly [];
//
//   fieldAndLabels: Record<string, string[] | Record<string, string[]>>;
//   dataBases: {
//     _main: EntityTarget<T>;
//     [key: string]: EntityTarget<T>;
//   };
//   dataSource: DataSource;
//   FE_permission?: Record<string, string[]>;
// };
//
//
// //======================================================
//
// export class FilterDbField<T extends ObjectLiteral> {
//   private readonly keyAndLabels: any;
//   private readonly permission: Record<string, Set<string>>;
//
//   constructor(input: Input<T>) {
//
//     this.keyAndLabels = this.createSetsOfKeyAndLabels(input);
//
//     if (input.FE_permission)
//       this.permission = this.createPermission(input.FE_permission);
//   }
//
//   //--------------------------------------------------------------
//   // private
//
//   private createPermission(input: Record<string, string[]>) {
//     const output: any = {};
//     Object.entries(input).forEach(([key, value]) => {
//       output[key] = new Set(value);
//     });
//     return output;
//   }
//
//   private createSetsOfKeyAndLabels(
//     input: Input<T>,
//   ): Record<string, Set<string>> {
//     const { fieldAndLabels, dataBases, dataSource } = input;
//
//     const AllDbColumns = Object.fromEntries(
//       Object.entries(dataBases).map(([key, dataBase]) => {
//         return [
//           key,
//           new Set(
//             dataSource
//               .getMetadata(dataBase)
//               .columns.map((col) => col.propertyName),
//           ),
//         ];
//       }),
//     );
//
//     return Object.fromEntries(
//       Object.entries(fieldAndLabels).map(([mainKey, mainLabels]) => {
//         if (Array.isArray(mainLabels)) {
//           if (!AllDbColumns._main.has(mainKey))
//             throw new Error(
//               `server : FilterDbField created fail -  input key ( ${mainKey} ) not in database column.`,
//             );
//           return [mainKey, new Set(mainLabels)];
//         } else {
//           // type = object
//           const relation = Object.fromEntries(
//             Object.entries(mainLabels).map(([relationKey, relationLabels]) => {
//               if (!AllDbColumns[mainKey].has(relationKey))
//                 // check is  declared entity in param
//
//                 throw new Error(
//                   `server : FilterDbField created fail -  input relation key ( ${relationKey} ) not in database column.`,
//                 );
//               return [relationKey, new Set(relationLabels)];
//             }),
//           );
//           return [mainKey, relation];
//         }
//       }),
//     );
//   }
//
//   //--------------------------------------------------------------
//
//   // Service
//
//   getLabelPermission(label: string) {
//     if (!this.permission) return {}
//
//     const output: any = {};
//     Object.entries(this.permission).forEach(([key, labels]) => {
//       if (labels?.has(label)) output[key] = true;
//     });
//     return output;
//   }
//
//   buildQueryObject(input: { label: string }) {
//     const select: any = {};
//     const relation: any = {};
//     const { label } = input;
//
//     Object.entries(this.keyAndLabels).forEach(
//       ([field, value]: [string, any]) => {
//         if (value instanceof Set) {
//           if (value?.has(label)) select[field] = true;
//         } else {
//           // is objectt
//           const relationQueries: any = {};
//
//           Object.entries(value).forEach(
//             ([relationKey, relationSet]: [string, any]) => {
//               if (relationSet?.has(label)) {
//                 relationQueries[relationKey] = true;
//                 relation[field] = true;
//               }
//             },
//           );
//
//           // if there is a relation key
//           if (Object.keys(relationQueries).length > 0) {
//             relation[field] = relationQueries;
//           }
//         }
//       },
//     );
//     const permission = this.getLabelPermission(label);
//
//     return { select, relation, permission };
//   }
//
//   /*
//   when u got all the entity( obj of data ) from database and wanna filter it before return to client
//   */
//   filterDataOfQueryResult(input: {
//     object: Record<string, any>;
//     label: string;
//   }) {
//     const { object, label } = input; // label === role
//     const output = {} as Record<string, any>;
//
//     Object.entries(object).forEach(([field, value]) => {
//       if (this.keyAndLabels[field]?.has(label)) output[field] = value;
//     });
//
//     return output;
//   }
//
//   // =====================================================
//
//   /*
//   initialize func = create a obj contain key and labels ( represent for roles or whatever u want  )
//    */
//   // getQuerySelectArray(param: { label: string; tableName: string }) {}
// }