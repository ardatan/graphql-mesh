import { Histogram, Registry } from 'prom-client';

export const commonLabelsForEnvelop = ['operationType', 'operationName'] as const;

export function commonFillLabelsFnForEnvelop(params: {
  operationName?: string;
  operationType?: string;
}) {
  return {
    operationName: params.operationName!,
    operationType: params.operationType!,
  };
}

interface CreateHistogramContainerForEnvelop {
  defaultName: string;
  help: string;
  valueFromConfig: string | boolean;
  registry: Registry;
}

export function createHistogramForEnvelop({
  defaultName,
  help,
  valueFromConfig,
  registry,
}: CreateHistogramContainerForEnvelop) {
  return {
    histogram: new Histogram({
      name: typeof valueFromConfig === 'string' ? valueFromConfig : defaultName,
      help,
      labelNames: commonLabelsForEnvelop,
      registers: [registry],
    }),
    fillLabelsFn: commonFillLabelsFnForEnvelop,
  };
}
