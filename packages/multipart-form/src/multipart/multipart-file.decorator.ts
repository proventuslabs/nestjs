import { BadRequestException, createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { Request } from "express";
import { isString } from "lodash";

import type { MultipartFileUpload } from "./multipart.types";

export function multipartFileFactory(
	options: string | { fieldname: string; required?: boolean },
	ctx: ExecutionContext,
): MultipartFileUpload | undefined {
	if (ctx.getType() !== "http") return undefined;

	const request = ctx.switchToHttp().getRequest<Request>();

	const files = request.files || [];

	let fieldname: string;
	let required = true;

	if (isString(options)) {
		fieldname = options;
	} else {
		fieldname = options.fieldname;
		required = options.required ?? false;
	}

	const file = files.find((file) => file.fieldname === fieldname);

	if (required && !file) {
		throw new BadRequestException(`File "${fieldname}" is required.`);
	}

	return file;
}

export const MultipartFile = createParamDecorator(multipartFileFactory);
