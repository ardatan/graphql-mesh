import {
  createUnauthenticatedError,
  type GenericAuthPluginOptions,
  type ValidateUserFn,
} from '@envelop/generic-auth';
import type { JWTExtendContextFields } from '@graphql-mesh/plugin-jwt-auth';
import type { MeshServeContext } from '@graphql-mesh/serve-runtime';
import { getDirectiveExtensions, mapMaybePromise } from '@graphql-mesh/utils';
import type { MaybePromise } from '@graphql-tools/utils';

export const JWT_WITH_REQUIRES_SCOPE: GenericAuthPluginOptions<
  JWTExtendContextFields,
  MeshServeContext & { jwt?: JWTExtendContextFields },
  'jwt'
> & { validateUser: ValidateUserFn<JWTExtendContextFields> } = {
  mode: 'protect-granular',
  contextFieldName: 'jwt',
  resolveUserFn(context) {
    return context.jwt;
  },
  rejectUnauthenticated: false,
  validateUser({ user: jwt, field, fieldNode, path }) {
    const directiveExtensions = getDirectiveExtensions(field);
    if (directiveExtensions?.authenticated?.length) {
      if (!jwt?.payload) {
        return createUnauthenticatedError({
          fieldNode,
          path,
          message: 'Unauthorized field or type',
          statusCode: 401,
        });
      }
    }
    if (directiveExtensions?.requiresScopes?.length) {
      const availableScopesStr = jwt.payload?.scope;
      if (typeof availableScopesStr === 'string') {
        const availableScopes = availableScopesStr.split(' ');
        if (availableScopes.length) {
          for (const requiresScopesDir of directiveExtensions.requiresScopes) {
            const scopesList: string[][] = requiresScopesDir.scopes;
            for (const scopes of scopesList) {
              if (scopes.every(scope => availableScopes.includes(scope))) {
                return;
              }
            }
          }
        }
      }
      return createUnauthenticatedError({
        fieldNode,
        path,
        message: 'Unauthorized field or type',
        statusCode: 401,
      });
    }
  },
};

export function createJwtWithRequiresScope<ContextField extends string = 'jwt'>(
  options: Partial<
    GenericAuthPluginOptions<
      JWTExtendContextFields,
      MeshServeContext & { [key in ContextField]?: JWTExtendContextFields },
      ContextField
    > & {
      extractPolicies(
        ctx: MeshServeContext & { [key in ContextField]?: JWTExtendContextFields },
      ): MaybePromise<string[]>;
    }
  > = {},
) {
  if (options?.extractPolicies) {
    const { extractPolicies, contextFieldName = 'jwt', ...rest } = options;
    const policiesByJwtPayload = new WeakMap<any, string[]>();
    return {
      ...JWT_WITH_REQUIRES_SCOPE,
      ...rest,
      resolveUserFn(
        context: MeshServeContext & { [key in ContextField]?: JWTExtendContextFields },
      ) {
        const jwtPayload = context[contextFieldName as string];
        return mapMaybePromise(extractPolicies(context), policies => {
          policiesByJwtPayload.set(jwtPayload, policies);
          return jwtPayload;
        });
      },
      validateUser(payload) {
        const res = JWT_WITH_REQUIRES_SCOPE.validateUser(payload);
        if (res) {
          return res;
        }
        const directiveExtensions = getDirectiveExtensions(payload.field);
        if (directiveExtensions?.policy?.length) {
          const policies = policiesByJwtPayload.get(payload.user);
          if (policies?.length) {
            for (const policyDir of directiveExtensions.policy) {
              if (policyDir.policies?.length) {
                for (const policyArr of policyDir.policies) {
                  if (policyArr.every(policy => policies.includes(policy))) {
                    return;
                  }
                }
              }
            }
          }
          console.log({
            res,
            policies,
            policiesArr: directiveExtensions.policy,
          });
          return createUnauthenticatedError({
            fieldNode: payload.fieldNode,
            path: payload.path,
            message: 'Unauthorized field or type',
            statusCode: 401,
          });
        }
      },
    } as GenericAuthPluginOptions<
      JWTExtendContextFields,
      MeshServeContext & { [key in ContextField]?: JWTExtendContextFields },
      ContextField
    >;
  }
  return {
    ...JWT_WITH_REQUIRES_SCOPE,
    ...options,
  } as GenericAuthPluginOptions<
    JWTExtendContextFields,
    MeshServeContext & { [key in ContextField]?: JWTExtendContextFields },
    ContextField
  >;
}

export * from '@envelop/generic-auth';
