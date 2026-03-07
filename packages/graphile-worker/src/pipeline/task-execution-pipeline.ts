import type {
  CanActivate,
  CallHandler,
  ExceptionFilter,
  NestInterceptor,
  PipeTransform,
  Type,
  ArgumentMetadata,
} from '@nestjs/common';
import { Observable, lastValueFrom, of } from 'rxjs';
import { GraphileExecutionContext } from '../context/graphile-execution-context';
import type { JobHelpers } from 'graphile-worker';

export interface TaskPipeline {
  guards: CanActivate[];
  pipes: PipeTransform[];
  interceptors: NestInterceptor[];
  filters: ExceptionFilter[];
  handler: (payload: unknown, helpers: JobHelpers) => Promise<void>;
}

export async function executeTaskPipeline(
  pipeline: TaskPipeline,
  payload: unknown,
  helpers: JobHelpers,
  taskClass: Type,
  handlerFn: Function,
): Promise<void> {
  const ctx = new GraphileExecutionContext(payload, helpers, taskClass, handlerFn);

  // 1. Guards
  for (const guard of pipeline.guards) {
    const result = guard.canActivate(ctx);
    const allowed = result instanceof Observable ? await lastValueFrom(result) : await Promise.resolve(result);
    if (!allowed) {
      throw new Error(`Guard ${guard.constructor.name} denied access to task`);
    }
  }

  // 2. Pipes (on payload — type: 'body')
  const meta: ArgumentMetadata = { type: 'body', metatype: Object };
  let transformedPayload = payload;
  for (const pipe of pipeline.pipes) {
    transformedPayload = await pipe.transform(transformedPayload, meta);
  }

  // 3. Interceptors + handler wrapped in CallHandler
  const coreHandler: CallHandler = {
    handle: () => of(pipeline.handler(transformedPayload, helpers)),
  };

  const chain = pipeline.interceptors.reduceRight(
    (next, interceptor) => ({
      handle: () => interceptor.intercept(ctx, next) as Observable<any>,
    }),
    coreHandler,
  );

  try {
    await lastValueFrom(chain.handle());
  } catch (err) {
    // 4. Exception filters
    for (const filter of pipeline.filters) {
      const catches = Reflect.getMetadata('__exceptionFilters__', filter.constructor) as Type[] | undefined;
      if (!catches || catches.some((type) => err instanceof type)) {
        filter.catch(err, ctx);
        return; // filter handled → no retry
      }
    }
    throw err; // unhandled → graphile retries
  }
}
