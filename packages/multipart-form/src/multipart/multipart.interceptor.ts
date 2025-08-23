import {
	type CallHandler,
	type ExecutionContext,
	Inject,
	Injectable,
	type NestInterceptor,
	Optional,
} from "@nestjs/common";

import type { Request } from "express";
import { type Observable, Subject } from "rxjs";
import { finalize, switchMap, tap } from "rxjs/operators";

import { MODULE_OPTIONS_TOKEN } from "./multipart.module-definition";
import { parseMultipartData } from "./multipart.parser";
import type { MultipartOptions } from "./multipart.types";

/**
 * Creates a NestJS HTTP interceptor that parses multipart/form-data requests.
 *
 * This interceptor:
 * - Uses `busboy` under the hood to process incoming files and fields from the request.
 * - Attaches `files` and `fields` streams to `req.files` and `req.fields` for downstream handlers.
 * - Ensures proper cleanup of file streams after the request is handled.
 * - Only applies to HTTP requests; other contexts are passed through unchanged.
 *
 * @param localOptions Optional configuration for the multipart parser, matching `MultipartOptions`.
 * @returns A NestJS interceptor class that can be applied via `@UseInterceptors`.
 *
 * @example
 * ‍@Post('upload')
 * ‍@UseInterceptors(MultipartInterceptor({ limits: { files: 5 } }))
 * upload(‍@Req() req) {
 *   // Access uploaded files and fields via req.files and req.fields
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

			// we cleanup after consumers in case incoming streams are left unconsumed
			const cleanup = () => {
				upstreamExecutionDone$.complete();

				if (!req._files$) return Promise.resolve();

				return req._files$
					.forEach((file) => {
						if (file.readable) file.resume();
						// if (file.listenerCount('readable') > 0) // warning?
					})
					.catch(() => {});
			};

			return parser$.pipe(switchMap(() => next.handle().pipe(finalize(cleanup))));
		}
	}

	return MultipartInterceptor;
}
