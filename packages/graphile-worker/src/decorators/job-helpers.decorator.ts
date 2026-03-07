import { JOB_HELPERS_INDEX } from '../constants';

export function JobHelpers(): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    Reflect.defineMetadata(JOB_HELPERS_INDEX, parameterIndex, target, propertyKey!);
  };
}
