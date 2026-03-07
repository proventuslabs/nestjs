import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { TaskExplorer } from './task-explorer';
import { GRAPHILE_TASK_NAME } from '../constants';

describe('TaskExplorer', () => {
  let explorer: TaskExplorer;
  let discoveryService: DiscoveryService;
  let reflector: Reflector;
  let applicationConfig: ApplicationConfig;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TaskExplorer,
        {
          provide: DiscoveryService,
          useValue: { getProviders: jest.fn().mockReturnValue([]) },
        },
        {
          provide: Reflector,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
        {
          provide: ApplicationConfig,
          useValue: {
            getGlobalGuards: jest.fn().mockReturnValue([]),
            getGlobalInterceptors: jest.fn().mockReturnValue([]),
            getGlobalPipes: jest.fn().mockReturnValue([]),
            getGlobalFilters: jest.fn().mockReturnValue([]),
          },
        },
      ],
    }).compile();

    explorer = module.get(TaskExplorer);
    discoveryService = module.get(DiscoveryService);
    reflector = module.get(Reflector);
    applicationConfig = module.get(ApplicationConfig);
  });

  it('registers tasks found with GRAPHILE_TASK_NAME metadata', () => {
    class MyTask {
      execute = jest.fn();
    }
    const instance = new MyTask();

    (discoveryService.getProviders as jest.Mock).mockReturnValue([{ instance }]);
    (reflector.get as jest.Mock).mockImplementation((key: symbol, target: any) => {
      if (key === GRAPHILE_TASK_NAME) return 'my-task';
      return undefined;
    });

    explorer.onApplicationBootstrap();
    const taskList = explorer.getTaskList();

    expect(taskList).toHaveProperty('my-task');
    expect(typeof taskList['my-task']).toBe('function');
  });

  it('skips providers without the metadata', () => {
    class NotATask {}
    const instance = new NotATask();

    (discoveryService.getProviders as jest.Mock).mockReturnValue([
      { instance },
      { instance: null },
      { instance: 'not-an-object' },
    ]);
    (reflector.get as jest.Mock).mockReturnValue(undefined);

    explorer.onApplicationBootstrap();
    const taskList = explorer.getTaskList();

    expect(Object.keys(taskList)).toHaveLength(0);
  });

  it('merges global guards with class-level guards in the pipeline', async () => {
    const globalGuard = { canActivate: jest.fn().mockReturnValue(true) };
    const classGuard = { canActivate: jest.fn().mockReturnValue(true) };

    class GuardedTask {
      execute = jest.fn();
    }
    const instance = new GuardedTask();

    (discoveryService.getProviders as jest.Mock).mockReturnValue([{ instance }]);
    (reflector.get as jest.Mock).mockImplementation((key: symbol | string) => {
      if (key === GRAPHILE_TASK_NAME) return 'guarded-task';
      if (key === '__guards__') return [classGuard];
      return [];
    });
    (applicationConfig.getGlobalGuards as jest.Mock).mockReturnValue([globalGuard]);

    explorer.onApplicationBootstrap();
    const taskList = explorer.getTaskList();

    const mockHelpers = {
      job: {} as any,
      logger: console as any,
      withPgClient: jest.fn(),
      addJob: jest.fn(),
      abortSignal: new AbortController().signal,
    } as any;

    await taskList['guarded-task']({}, mockHelpers);

    expect(globalGuard.canActivate).toHaveBeenCalled();
    expect(classGuard.canActivate).toHaveBeenCalled();
  });

  it('registered task handler calls instance.execute when invoked', async () => {
    class MyTask {
      execute = jest.fn();
    }
    const instance = new MyTask();

    (discoveryService.getProviders as jest.Mock).mockReturnValue([{ instance }]);
    (reflector.get as jest.Mock).mockImplementation((key: symbol | string) => {
      if (key === GRAPHILE_TASK_NAME) return 'exec-task';
      return undefined;
    });

    explorer.onApplicationBootstrap();
    const taskList = explorer.getTaskList();

    const mockHelpers = {
      job: {} as any,
      logger: console as any,
      withPgClient: jest.fn(),
      addJob: jest.fn(),
      abortSignal: new AbortController().signal,
    } as any;

    await taskList['exec-task']({ data: 1 }, mockHelpers);

    expect(instance.execute).toHaveBeenCalledWith({ data: 1 }, mockHelpers);
  });
});
