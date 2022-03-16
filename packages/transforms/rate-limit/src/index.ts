import { MeshTransform, MeshTransformOptions, ResolverData, YamlConfig } from '@graphql-mesh/types';
import type { ExecutionRequest } from '@graphql-tools/utils';
import type { DelegationContext } from '@graphql-tools/delegate';
import { GraphQLError, TypeInfo, visit, visitWithTypeInfo } from 'graphql';
import { stringInterpolator } from '@graphql-mesh/utils';

export default class RateLimitTransform implements MeshTransform {
  private pathRateLimitDef = new Map<string, YamlConfig.RateLimitTransformConfig>();
  private identifierTokenMap = new Map<string, number>();
  private timeouts = new Set<NodeJS.Timeout>();
  constructor(options: MeshTransformOptions<YamlConfig.RateLimitTransformConfig[]>) {
    if (options.config) {
      options.config.forEach(config => {
        this.pathRateLimitDef.set(`${config.type}.${config.field}`, config);
      });
    }
    if (options.pubsub) {
      options.pubsub
        .subscribe('destroy', () => {
          this.timeouts.forEach(timeout => clearTimeout(timeout));
        })
        .catch(e => console.warn(`Error cleaning up rate limit transform: ${e.stack || e.message || e}`));
    }
  }

  transformRequest(
    executionRequest: ExecutionRequest,
    { transformedSchema, rootValue, args, context, info }: DelegationContext
  ): ExecutionRequest {
    if (transformedSchema) {
      const resolverData: ResolverData = {
        env: process.env,
        root: rootValue,
        args,
        context,
        info,
      };
      const typeInfo = new TypeInfo(transformedSchema);
      visit(
        executionRequest.document,
        visitWithTypeInfo(typeInfo, {
          Field: () => {
            const parentType = typeInfo.getParentType();
            const fieldDef = typeInfo.getFieldDef();
            const path = `${parentType.name}.${fieldDef.name}`;
            const rateLimitConfig = this.pathRateLimitDef.get(path);
            if (rateLimitConfig) {
              const identifier = stringInterpolator.parse(rateLimitConfig.identifier, resolverData);
              let remainingTokens = this.identifierTokenMap.get(identifier);

              if (remainingTokens == null) {
                remainingTokens = rateLimitConfig.max;
                const timeout = setTimeout(() => {
                  this.identifierTokenMap.delete(identifier);
                  this.timeouts.delete(timeout);
                }, rateLimitConfig.ttl);
                this.timeouts.add(timeout);
              }

              if (remainingTokens === 0) {
                throw new GraphQLError(`Rate limit of exceeded for "${identifier}"`, undefined, undefined, undefined, [
                  parentType.name,
                  fieldDef.name,
                ]);
              } else {
                this.identifierTokenMap.set(identifier, remainingTokens - 1);
              }
            }
          },
        })
      );
    }
    return executionRequest;
  }
}
