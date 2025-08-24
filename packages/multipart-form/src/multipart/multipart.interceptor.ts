import {
	type CallHandler,
	type ExecutionContext,
	Inject,
	Injectable,
	type NestInterceptor,
	Optional,
} from "@nestjs/common";

import type { Request } from "express";
import { finalize, type Observable, Subject, switchMap, tap } from "rxjs";

import { MODULE_OPTIONS_TOKEN } from "./multipart.module-definition";
import { parseMultipartData } from "./multipart.parser";
import type { MultipartOptions } from "./multipart.types";

/**
 * Creates a NestJS HTTP interceptor that parses multipart/form-data requests using RxJS streams.
 *
 * This interceptor:
 * - Attaches `_files$` and `_fields$` observables to the request object for use with decorators
 * - Ensures proper cleanup of file streams after the request is handled
 * - Only applies to HTTP requests; other contexts are passed through unchanged
 * - Supports both global (module-level) and local (interceptor-level) configuration
 *
 * @param localOptions Optional configuration for the multipart parser that overrides global options
 * @returns A NestJS interceptor class that can be applied via `@UseInterceptors`
 *
 * @example
 * ‍@Post('upload')
 * ‍@UseInterceptors(MultipartInterceptor({ limits: { files: 5 } }))
 * upload(
 *   ‍@MultipartFiles() files$: Observable<MultipartFileStream>,
 *   ‍@MultipartFields() fields$: Observable<MultipartField>
 * ) {
 *   // Process files and fields as RxJS streams
 *   return merge(files$, fields$).pipe(toArray());
 * }
 */
export function MultipartInterceptor(localOptions?: MultipartOptions) {
	@Injectable()
	class MultipartInterceptor implements NestInterceptor {
		constructor(
			@Optional()
			@Inject(MODULE_OPTIONS_TOKEN)
			readonly globalOptions?: MultipartOptions,
		) {}

		intercept(ctx: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
			if (ctx.getType() !== "http") return next.handle();

			const req = ctx.switchToHttp().getRequest<Request>();

			const options = localOptions ?? this.globalOptions;

			// this subject is used to signal downstream when execution has been completed
			const upstreamExecutionDone$ = new Subject<never>();

			const parser$ = parseMultipartData(req, req.headers, upstreamExecutionDone$, options).pipe(
				tap(({ files, fields }) => {
					req._files$ = files;
					req._fields$ = fields;
				}),
			);

			const drain = () => {
				if (!req._files$ || options?.autodrain === false) return Promise.resolve();

				return req._files$
					.forEach((file) => {
						if (file.readable) file.resume();
						// REVIEW: should we issue a warning if (file.listenerCount('readable') > 0)?
					})
					.catch(() => {});
			};

			const done = () => {
				upstreamExecutionDone$.complete();
			};

			return parser$.pipe(
				switchMap(() => next.handle().pipe(tap({ subscribe: drain }), finalize(done))),
			);
		}
	}

	return MultipartInterceptor;
}
