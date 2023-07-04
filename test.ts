interface Generator {
  next(): GeneratorNextResult;
}

type GeneratorNextResult = GeneratorNextResultWithValue | GeneratorNextResultWithDone;

interface GeneratorNextResultWithValue {
  value: any;
  done: false;
}

interface GeneratorNextResultWithDone {
  done: true;
}
