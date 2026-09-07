

type Input = Record<string, string[]>;

export class filterDbField {
  // private keyAndLabels: Record<string, Set<string>>;
  private readonly keyAndLabels: Record<string, Set<string>>;

  constructor(keyAndLabels: Input) {
    this.keyAndLabels = this.createSets(keyAndLabels);
    // { id : new [ admin , me ,...  ] }
  }

  private createSets(keyAndLabels: Input): Record<string, Set<string>> {
    return Object.fromEntries(
      Object.entries(keyAndLabels).map(([key, labels]) => [
        key,
        new Set<string>(labels),
      ]),
    );
  }

  getQueryArray(input: { label: string; tableName: string }) {
    const array: string[] = [];
    const { label, tableName } = input;

    Object.entries(this.keyAndLabels).forEach(([field, labels]) => {
      if (labels.has(label)) array.push(`${tableName}.${field} AS ${field}`);
    });

    return array;
  }
}