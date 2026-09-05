

type input = {
  string : string[]
}

export class ObjectKeyFilter {
  private keyAndLabels: Record<string, Set<string>>;

  constructor(keyAndLabels: input) {
    this.keyAndLabels = this.createSets(keyAndLabels);
  }

  private createSets(keyAndLabels: input): Record<string, Set<string>> {
    return Object.fromEntries(
      Object.entries(keyAndLabels).map(([key, labels]) => [
        key,
        new Set<string>(labels),
      ]),
    );
  }

  filtering( label : string , customCondition : { string : ()=>boolean  } ) {

    const condition = Object.entries(customCondition);



  }


}