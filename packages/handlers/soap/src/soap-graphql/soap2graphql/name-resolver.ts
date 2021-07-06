import { SoapObjectType } from './soap-endpoint';

export type NameResolver = (soapType: SoapObjectType) => string;

export const defaultOutputNameResolver: NameResolver = (soapType: SoapObjectType) => {
  return !soapType ? null : !soapType.name ? null : capitalizeFirstLetter(soapType.name);
};

export const defaultInputNameResolver: NameResolver = (soapType: SoapObjectType) => {
  return !soapType ? null : !soapType.name ? null : capitalizeFirstLetter(soapType.name) + 'Input';
};

export const defaultInterfaceNameResolver: NameResolver = (soapType: SoapObjectType) => {
  return !soapType ? null : !soapType.name ? null : 'i' + capitalizeFirstLetter(soapType.name);
};

function capitalizeFirstLetter(value: string) {
  return value.charAt(0).toUpperCase() + value.substring(1);
}
