import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Optional,
} from '@nestjs/common';
import { run, Runner } from 'graphile-worker';
import { GRAPHILE_WORKER_OPTIONS } from './constants';
import type { GraphileWorkerModuleOptions } from './interfaces';
import { GraphileWorkerService } from './graphile-worker.service';
import { TaskExplorer } from './discovery/task-explorer';

// EventEmitter2 is optional — avoid a hard import
type EventEmitter2Like = { emit: (event: string, ...args: any[]) => any };

@Injectable()
export class GraphileWorkerRunner
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(GraphileWorkerRunner.name);
  private runner: Runner | null = null;

  constructor(
    @Inject(GRAPHILE_WORKER_OPTIONS) private readonly options: GraphileWorkerModuleOptions,
    private readonly service: GraphileWorkerService,
    private readonly explorer: TaskExplorer,
    @Optional() @Inject('EventEmitter2') private readonly eventEmitter?: EventEmitter2Like,
  ) {}

  async onApplicationBootstrap() {
    const taskList = this.explorer.getTaskList();

    this.runner = await run({
      pgPool: this.options.pgPool,
      concurrency: this.options.concurrency ?? 5,
      noHandleSignals: true,
      taskList,
    });

    this.service._setAddJob(this.runner.addJob);

    if (this.eventEmitter) {
      this.runner.events.on('job:success', (e) => this.eventEmitter!.emit('graphile.job:success', e));
      this.runner.events.on('job:error', (e) => this.eventEmitter!.emit('graphile.job:error', e));
      this.runner.events.on('job:failed', (e) => this.eventEmitter!.emit('graphile.job:failed', e));
      this.runner.events.on('worker:getJob:error', (e) => this.eventEmitter!.emit('graphile.worker:getJob:error', e));
    }

    this.logger.log('graphile-worker runner started');
  }

  async onApplicationShutdown() {
    await this.runner?.stop();
    this.logger.log('graphile-worker runner stopped');
  }
}
