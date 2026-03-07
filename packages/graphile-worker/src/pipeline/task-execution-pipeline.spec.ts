import 'reflect-metadata';
import { executeTaskPipeline, TaskPipeline } from './task-execution-pipeline';
import { of } from 'rxjs';
import type { JobHelpers } from 'graphile-worker';

const helpers: JobHelpers = {
  job: {} as any,
  logger: console as any,
  withPgClient: jest.fn(),
  addJob: jest.fn(),
  abortSignal: new AbortController().signal,
} as any;

class DummyTask {
  async execute() {}
}

function makePipeline(overrides: Partial<TaskPipeline> = {}): TaskPipeline {
  return {
    guards: [],
    pipes: [],
    interceptors: [],
    filters: [],
    handler: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('executeTaskPipeline', () => {
  it('calls handler with payload and helpers when pipeline is empty', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const pipeline = makePipeline({ handler });

    await executeTaskPipeline(pipeline, { foo: 1 }, helpers, DummyTask, DummyTask.prototype.execute);

    expect(handler).toHaveBeenCalledWith({ foo: 1 }, helpers);
  });

  it('throws when a guard returns false', async () => {
    const guard = { canActivate: jest.fn().mockReturnValue(false) };
    const pipeline = makePipeline({ guards: [guard] });

    await expect(
      executeTaskPipeline(pipeline, {}, helpers, DummyTask, DummyTask.prototype.execute),
    ).rejects.toThrow('denied access');
  });

  it('throws when a guard returns Promise<false>', async () => {
    const guard = { canActivate: jest.fn().mockResolvedValue(false) };
    const pipeline = makePipeline({ guards: [guard] });

    await expect(
      executeTaskPipeline(pipeline, {}, helpers, DummyTask, DummyTask.prototype.execute),
    ).rejects.toThrow('denied access');
  });

  it('transforms payload through pipes before passing to handler', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const pipe = { transform: jest.fn().mockResolvedValue({ transformed: true }) };
    const pipeline = makePipeline({ pipes: [pipe], handler });

    await executeTaskPipeline(pipeline, { original: true }, helpers, DummyTask, DummyTask.prototype.execute);

    expect(pipe.transform).toHaveBeenCalledWith({ original: true }, { type: 'body', metatype: Object });
    expect(handler).toHaveBeenCalledWith({ transformed: true }, helpers);
  });

  it('catches errors with a matching exception filter', async () => {
    const error = new TypeError('boom');
    const handler = jest.fn().mockRejectedValue(error);
    const filter = { catch: jest.fn() };
    Reflect.defineMetadata('__exceptionFilters__', [TypeError], filter.constructor);
    const pipeline = makePipeline({ handler, filters: [filter] });

    await executeTaskPipeline(pipeline, {}, helpers, DummyTask, DummyTask.prototype.execute);

    expect(filter.catch).toHaveBeenCalledWith(error, expect.anything());
  });

  it('rethrows errors when no filter matches', async () => {
    const error = new RangeError('out of range');
    const handler = jest.fn().mockRejectedValue(error);
    const filter = { catch: jest.fn() };
    Reflect.defineMetadata('__exceptionFilters__', [TypeError], filter.constructor);
    const pipeline = makePipeline({ handler, filters: [filter] });

    await expect(
      executeTaskPipeline(pipeline, {}, helpers, DummyTask, DummyTask.prototype.execute),
    ).rejects.toThrow('out of range');
    expect(filter.catch).not.toHaveBeenCalled();
  });

  it('runs interceptors around the handler', async () => {
    const handler = jest.fn().mockResolvedValue('result');
    const interceptor = {
      intercept: jest.fn().mockImplementation((_ctx, next) => next.handle()),
    };
    const pipeline = makePipeline({ handler, interceptors: [interceptor] });

    await executeTaskPipeline(pipeline, {}, helpers, DummyTask, DummyTask.prototype.execute);

    expect(interceptor.intercept).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ handle: expect.any(Function) }));
    expect(handler).toHaveBeenCalled();
  });
});
