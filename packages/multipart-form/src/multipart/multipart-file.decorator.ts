import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { Request } from "express";
import { isString } from "lodash";
import { EMPTY, filter, type Observable } from "rxjs";

import type { MultipartFileStream } from "./multipart.types";

export function multipartFileFactory(
	options: string | { fieldname: string },
	ctx: ExecutionContext,
): Observable<MultipartFileStream> {
	if (ctx.getType() !== "http") return EMPTY;

	const request = ctx.switchToHttp().getRequest<Request>();

	const files$ = request.files;
	if (!files$) return EMPTY;

	let fieldname: string;

	if (isString(options)) {
		fieldname = options;
	} else {
		fieldname = options.fieldname;
	}

	// Listen to the Subject for a matching fieldname
	const matchingFile$ = files$.pipe(filter((file) => file.fieldname === fieldname));

	return matchingFile$;
}

export const MultipartFile = createParamDecorator(multipartFileFactory);
