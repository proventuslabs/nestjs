import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import type { Type } from '@nestjs/common';
import type { JobHelpers } from 'graphile-worker';

export interface GraphileArgumentsHost {
  getPayload<T = unknown>(): T;
  getHelpers(): JobHelpers;
}

export class GraphileExecutionContext
  extends ExecutionContextHost
  implements GraphileArgumentsHost
{
  constructor(
    payload: unknown,
    helpers: JobHelpers,
    taskClass: Type,
    handler: Function,
  ) {
    super([payload, helpers], taskClass, handler);
    this.setType<'graphile'>('graphile');
  }

  switchToGraphile(): GraphileArgumentsHost {
    return this;
  }

  getPayload<T = unknown>(): T {
    return this.getArgByIndex<T>(0);
  }

  getHelpers(): JobHelpers {
    return this.getArgByIndex<JobHelpers>(1);
  }
}
