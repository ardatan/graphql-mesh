interface Function {
  bind<TFunction, TContext>(this: TFunction, context: TContext): TFunction;
}
