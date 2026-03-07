import type { Pool } from 'pg';
import type { TaskSpec } from 'graphile-worker';

export interface GraphileWorkerModuleOptions {
  /** A pg.Pool to use for graphile-worker (caller creates / injects). */
  pgPool: Pool;
  /** Number of concurrent jobs. Default: 5. */
  concurrency?: number;
  /** Graphile-worker TaskSpec defaults applied to every addJob call. */
  taskDefaults?: Omit<TaskSpec, 'identifier'>;
}

export interface GraphileWorkerModuleAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (...args: any[]) => Promise<GraphileWorkerModuleOptions> | GraphileWorkerModuleOptions;
}
