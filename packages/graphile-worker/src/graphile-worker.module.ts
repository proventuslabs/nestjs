import { DynamicModule, Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { GRAPHILE_WORKER_OPTIONS } from './constants';
import type { GraphileWorkerModuleAsyncOptions } from './interfaces';
import { GraphileWorkerService } from './graphile-worker.service';
import { GraphileWorkerRunner } from './graphile-worker.runner';
import { TaskExplorer } from './discovery/task-explorer';

@Global()
@Module({})
export class GraphileWorkerModule {
  static forRootAsync(options: GraphileWorkerModuleAsyncOptions): DynamicModule {
    return {
      module: GraphileWorkerModule,
      imports: [...(options.imports ?? []), DiscoveryModule],
      providers: [
        {
          provide: GRAPHILE_WORKER_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        GraphileWorkerService,
        GraphileWorkerRunner,
        TaskExplorer,
      ],
      exports: [GraphileWorkerService],
    };
  }
}
