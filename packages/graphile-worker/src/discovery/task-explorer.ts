import { Injectable, OnApplicationBootstrap, Type } from '@nestjs/common';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { GRAPHILE_TASK_NAME } from '../constants';
import { executeTaskPipeline, TaskPipeline } from '../pipeline/task-execution-pipeline';
import type { TaskList } from 'graphile-worker';

@Injectable()
export class TaskExplorer implements OnApplicationBootstrap {
  private taskList: TaskList = {};

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly applicationConfig: ApplicationConfig,
  ) {}

  onApplicationBootstrap() {
    const providers = this.discovery.getProviders();

    for (const wrapper of providers) {
      const { instance } = wrapper;
      if (!instance || typeof instance !== 'object') continue;

      const taskName = this.reflector.get<string>(GRAPHILE_TASK_NAME, instance.constructor);
      if (!taskName) continue;

      const pipeline = this.buildPipeline(instance);
      const taskClass = instance.constructor as Type;
      const handlerFn = (instance as any).execute.bind(instance);

      this.taskList[taskName] = async (payload, helpers) => {
        await executeTaskPipeline(pipeline, payload, helpers, taskClass, handlerFn);
      };
    }
  }

  getTaskList(): TaskList {
    return this.taskList;
  }

  private buildPipeline(instance: any): TaskPipeline {
    const classGuards = this.reflector.get('__guards__', instance.constructor) ?? [];
    const classInterceptors = this.reflector.get('__interceptors__', instance.constructor) ?? [];
    const classPipes = this.reflector.get('__pipes__', instance.constructor) ?? [];
    const classFilters = this.reflector.get('__exceptionFilters__', instance.constructor) ?? [];

    const globalGuards = this.applicationConfig.getGlobalGuards();
    const globalInterceptors = this.applicationConfig.getGlobalInterceptors();
    const globalPipes = this.applicationConfig.getGlobalPipes();
    const globalFilters = this.applicationConfig.getGlobalFilters();

    return {
      guards: [...globalGuards, ...classGuards],
      pipes: [...globalPipes, ...classPipes],
      interceptors: [...globalInterceptors, ...classInterceptors],
      filters: [...globalFilters, ...classFilters],
      handler: (instance as any).execute.bind(instance),
    };
  }
}
