import { JOB_PAYLOAD_INDEX } from '../constants';

export function JobPayload(): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    Reflect.defineMetadata(JOB_PAYLOAD_INDEX, parameterIndex, target, propertyKey!);
  };
}
