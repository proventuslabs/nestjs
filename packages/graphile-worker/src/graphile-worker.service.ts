import { Injectable, Logger } from '@nestjs/common';
import type { AddJobFunction, TaskSpec } from 'graphile-worker';

@Injectable()
export class GraphileWorkerService {
  private readonly logger = new Logger(GraphileWorkerService.name);
  private _addJob: AddJobFunction | null = null;

  /** Called by GraphileWorkerRunner once the runner is live. */
  _setAddJob(fn: AddJobFunction) {
    this._addJob = fn;
  }

  async addJob<T extends Record<string, unknown> = Record<string, unknown>>(
    identifier: string,
    payload?: T,
    spec?: TaskSpec,
  ): Promise<void> {
    if (!this._addJob) {
      throw new Error(
        'GraphileWorkerService is not ready yet. Call addJob only after the application has bootstrapped.',
      );
    }
    await this._addJob(identifier, payload, spec);
  }
}
