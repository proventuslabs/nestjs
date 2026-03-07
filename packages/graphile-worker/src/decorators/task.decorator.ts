import { Injectable, SetMetadata, applyDecorators } from '@nestjs/common';
import { GRAPHILE_TASK_NAME, GRAPHILE_TASK_OPTIONS } from '../constants';

export interface TaskOptions {
  name: string;
  /** graphile-worker TaskSpec defaults for this task. */
  taskSpec?: Record<string, unknown>;
}

export function Task(nameOrOptions: string | TaskOptions): ClassDecorator {
  const options: TaskOptions =
    typeof nameOrOptions === 'string' ? { name: nameOrOptions } : nameOrOptions;
  return applyDecorators(
    Injectable(),
    SetMetadata(GRAPHILE_TASK_NAME, options.name),
    SetMetadata(GRAPHILE_TASK_OPTIONS, options),
  );
}
