import type { GraphQLSchema } from 'graphql';
import type { MeshTransform, MeshTransformOptions, YamlConfig } from '@graphql-mesh/types';
import {
  applyRequestTransforms,
  applyResultTransforms,
  applySchemaTransforms,
} from '@graphql-mesh/utils';
import type { DelegationContext, SubschemaConfig, Transform } from '@graphql-tools/delegate';
import type { ExecutionRequest, ExecutionResult } from '@graphql-tools/utils';
import { HoistField } from '@graphql-tools/wrap';

type HoistFieldCtorPathConfigItem = ConstructorParameters<typeof HoistField>[1][0];
type HoistFieldTransformFieldPathConfig = YamlConfig.HoistFieldTransformConfig['pathConfig'][0];

export default class MeshHoistField implements MeshTransform {
  noWrap = false;
  private transforms: Transform[];

  constructor({ config }: MeshTransformOptions<YamlConfig.HoistFieldTransformConfig[]>) {
    this.transforms = config.map(
      ({ typeName, pathConfig, newFieldName, alias, filterArgsInPath = false }) => {
        const processedPathConfig = pathConfig.map(config =>
          this.getPathConfigItem(config, filterArgsInPath),
        );
        return new HoistField(typeName, processedPathConfig, newFieldName, alias);
      },
    );
  }

  private getPathConfigItem(
    pathConfigItemFromConfig: HoistFieldTransformFieldPathConfig,
    filterArgsInPath: boolean,
  ): HoistFieldCtorPathConfigItem {
    if (typeof pathConfigItemFromConfig === 'string') {
      const pathConfigItem: HoistFieldCtorPathConfigItem = {
        fieldName: pathConfigItemFromConfig,
        argFilter: () => filterArgsValue(filterArgsInPath),
      };

      return pathConfigItem;
    }

    if (!pathConfigItemFromConfig.fieldName) {
      throw new Error(`Field name is required in pathConfig item`);
    }

    if (!pathConfigItemFromConfig.filterArgs) {
      throw new Error(`FilterArgs is required in pathConfig item`);
    }

    const filterArgsDict = (pathConfigItemFromConfig.filterArgs || []).reduce<any>(
      (prev, argName) => {
        prev[argName] = true;
        return prev;
      },
      {},
    );

    const pathConfigItem: HoistFieldCtorPathConfigItem = {
      fieldName: pathConfigItemFromConfig.fieldName,
      argFilter: arg => {
        return filterArgsValue(filterArgsDict[arg.name]);
      },
    };

    return pathConfigItem;
  }

  transformSchema(
    originalWrappingSchema: GraphQLSchema,
    subschemaConfig: SubschemaConfig,
    transformedSchema?: GraphQLSchema,
  ) {
    return applySchemaTransforms(
      originalWrappingSchema,
      subschemaConfig,
      transformedSchema,
      this.transforms,
    );
  }

  transformRequest(
    originalRequest: ExecutionRequest,
    delegationContext: DelegationContext,
    transformationContext: Record<string, any>,
  ) {
    return applyRequestTransforms(
      originalRequest,
      delegationContext,
      transformationContext,
      this.transforms,
    );
  }

  transformResult(
    originalResult: ExecutionResult,
    delegationContext: DelegationContext,
    transformationContext: any,
  ) {
    return applyResultTransforms(
      originalResult,
      delegationContext,
      transformationContext,
      this.transforms,
    );
  }
}

// The argFilters in HoistField seem to work more like argIncludes, hence the value needs to be negated
// https://github.com/ardatan/graphql-tools/blob/af266974bf02967e0675187e9bea0391fd7fe0cf/packages/wrap/src/transforms/HoistField.ts#L44
function filterArgsValue(filter: boolean) {
  return !filter;
}
