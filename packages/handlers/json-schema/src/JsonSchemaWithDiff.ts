import AggregateError from '@ardatan/aggregate-error';
import { ProxyOptions, PredefinedProxyOptions } from '@graphql-mesh/store';
import { JSONSchema } from '@json-schema-tools/meta-schema';
import { JsonPointer } from 'json-ptr';
import { visitJSONSchema } from './utils';

export const JsonSchemaWithDiff: ProxyOptions<JSONSchema> = {
  ...PredefinedProxyOptions.JsonWithoutValidation,
  validate: async (oldSchema, newSchema) => {
    const breakingChanges: string[] = [];
    await visitJSONSchema(
      oldSchema,
      (oldSubSchema, { path }) => {
        const newSubSchema = JsonPointer.get(newSchema, path) as any;
        if (typeof oldSubSchema === 'boolean') {
          if (newSubSchema !== oldSubSchema) {
            breakingChanges.push(`${path} is changed from ${oldSubSchema} to ${newSubSchema}`);
          }
        } else {
          if (oldSubSchema.$ref) {
            if (newSubSchema?.$ref !== oldSubSchema.$ref) {
              breakingChanges.push(`${path}/$ref is changed from ${oldSubSchema.$ref} to ${newSubSchema?.$ref}`);
            }
          }
          if (oldSubSchema.const) {
            if (newSubSchema?.const !== oldSubSchema.const) {
              breakingChanges.push(`${path}/const is changed from ${oldSubSchema.const} to ${newSubSchema?.const}`);
            }
          }
          if (oldSubSchema.enum) {
            for (const enumValue of oldSubSchema.enum) {
              if (!newSubSchema?.enum?.includes(enumValue)) {
                breakingChanges.push(`${path}/enum doesn't have ${enumValue} anymore`);
              }
            }
          }
          if (oldSubSchema.format) {
            if (newSubSchema?.format !== oldSubSchema.format) {
              breakingChanges.push(`${path}/format is changed from ${oldSubSchema.format} to ${newSubSchema?.format}`);
            }
          }
          if (oldSubSchema.maxLength) {
            if (oldSubSchema.maxLength > newSubSchema?.maxLength) {
              breakingChanges.push(
                `${path}/maxLength is changed from ${oldSubSchema.maxLength} to ${newSubSchema?.maxLength}`
              );
            }
          }
          if (oldSubSchema.minLength) {
            if (oldSubSchema.minLength < newSubSchema?.minLength) {
              breakingChanges.push(
                `${path}/minLength is changed from ${oldSubSchema.minLength} to ${newSubSchema?.minLength}`
              );
            }
          }
          if (oldSubSchema.pattern) {
            if (newSubSchema?.pattern?.toString() !== oldSubSchema.pattern.toString()) {
              breakingChanges.push(
                `${path}/pattern is changed from ${oldSubSchema.pattern} to ${newSubSchema?.pattern}`
              );
            }
          }

          if (oldSubSchema.properties) {
            for (const propertyName in oldSubSchema.properties) {
              if (!(propertyName in newSubSchema?.properties)) {
                breakingChanges.push(`${path}/properties doesn't have ${propertyName}`);
              }
            }
          }

          if (newSubSchema?.required) {
            for (const propertyName of newSubSchema.required) {
              if (!oldSubSchema.required?.includes(propertyName)) {
                breakingChanges.push(`${path}/required has ${propertyName} an extra`);
              }
            }
          }

          if (oldSubSchema.title) {
            if (newSubSchema?.title !== oldSubSchema.title) {
              breakingChanges.push(`${path}/title is changed from ${oldSubSchema.title} to ${newSubSchema?.title}`);
            }
          }

          if (oldSubSchema.type) {
            if (
              typeof newSubSchema?.type === 'string'
                ? newSubSchema?.type !== oldSubSchema.type
                : Array.isArray(newSubSchema?.type)
                ? Array.isArray(oldSubSchema.type)
                  ? oldSubSchema.type.some(typeName => !newSubSchema?.type.includes(typeName))
                  : !newSubSchema?.type.includes(oldSubSchema.type)
                : true
            ) {
              breakingChanges.push(`${path}/type is changed from ${oldSubSchema.type} to ${newSubSchema?.type}`);
            }
          }
        }
        return oldSubSchema;
      },
      {
        visitedSubschemaResultMap: new WeakMap(),
        path: '',
        keepObjectRef: true,
        reverse: true,
      }
    );
    if (breakingChanges.length > 0) {
      throw new AggregateError(breakingChanges);
    }
  },
};
