type StoreFlags = {
  readonly: boolean;
  validate: boolean;
};

type ProxyOptions<TData, TJSONData = any> = {
  codify: (value: TData, identifier: string) => string | Promise<string>;
  fromJSON: (jsonData: TJSONData, identifier: string) => TData | Promise<TData>;
  toJSON: (value: TData, identifier: string) => TJSONData | Promise<TJSONData>;
  validate: (oldValue: TData, newValue: TData, identifier: string) => void | Promise<void>;
};

type StoreProxy<TData> = {
  set(value: TData): Promise<void>;
  get(): Promise<TData>;
  getWithSet(setterFn: () => TData | Promise<TData>): Promise<TData>;
  delete(): Promise<void>;
};

export interface IMeshStore {
  child(childIdentifier: string, flags?: Partial<StoreFlags>): IMeshStore;
  proxy<TData>(id: string, options: ProxyOptions<TData>): StoreProxy<TData>;
}
