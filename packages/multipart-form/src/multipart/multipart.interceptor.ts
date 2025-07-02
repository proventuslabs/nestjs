import {
	BadRequestException,
	type CallHandler,
	type ExecutionContext,
	Injectable,
	Logger,
	type NestInterceptor,
} from "@nestjs/common";

import type busboy from "busboy";
import type { Request } from "express";
import { defer, type Observable, throwError } from "rxjs";
import { catchError, finalize, mergeMap } from "rxjs/operators";

import { parseMultipartData } from "./multipart.parser";

export function MultipartInterceptor(config?: Omit<busboy.BusboyConfig, "headers">) {
	@Injectable()
	class MultipartInterceptor implements NestInterceptor {
		readonly logger = new Logger(MultipartInterceptor.name);

		intercept(ctx: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
			if (ctx.getType() !== "http") return next.handle();

			const req = ctx.switchToHttp().getRequest<Request>();

			return defer(() => parseMultipartData(req, req.headers, config)).pipe(
				catchError((err) =>
					throwError(() => new BadRequestException("invalid multipart request", { cause: err })),
				),
				mergeMap(([files, fields]) => {
					req.files = files;
					req.body = fields;
					return next.handle();
				}),
				finalize(() => {
					for (const file of req.files ?? []) {
						if (!file.readableEnded) {
							file.resume();
						}
					}
				}),
			);
		}
	}

	return MultipartInterceptor;
}
