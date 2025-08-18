import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { Request } from "express";
import { isArray, isEmpty, isString, isUndefined } from "lodash";
import { EMPTY, filter, iif, type Observable } from "rxjs";

import type { MultipartFileStream } from "./multipart.types";

export function multipartFilesFactory(
	options: string | string[] | { fieldnames?: string[] } | undefined,
	ctx: ExecutionContext,
): Observable<MultipartFileStream> {
	if (ctx.getType() !== "http") return EMPTY;

	const request = ctx.switchToHttp().getRequest<Request>();
	const files$ = request.files;

	if (!files$) return EMPTY;

	let fieldnames: string[] | undefined;
	if (isString(options)) {
		fieldnames = [options];
	} else if (isArray(options)) {
		fieldnames = options;
	} else {
		fieldnames = options?.fieldnames;
	}

	const filteredFiles$ = iif(
		() => isUndefined(fieldnames) || isEmpty(fieldnames.length),
		files$,
		// biome-ignore lint/style/noNonNullAssertion: condition is checked above
		files$.pipe(filter((file) => fieldnames!.includes(file.fieldname))),
	);

	return filteredFiles$;
}

export const MultipartFiles = createParamDecorator(multipartFilesFactory);
