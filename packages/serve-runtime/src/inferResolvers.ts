import type { CreateMobius, Resolver } from 'graphql-mobius';

export type InferResolvers<T extends string> = Resolver<CreateMobius<T>>;
