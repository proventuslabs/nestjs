import { BadRequestException, createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { Request } from "express";
import { isArray, isEmpty, isString, isUndefined } from "lodash";

import type { MultipartFileUpload } from "./multipart.types";

export function multipartFilesFactory(
	options: string | string[] | { fieldnames?: string[]; required?: boolean } | undefined,
	ctx: ExecutionContext,
): MultipartFileUpload[] {
	if (ctx.getType() !== "http") return [];

	const request = ctx.switchToHttp().getRequest<Request>();
	const files = request.files || [];

	let fieldnames: string[] | undefined;
	let required = true;

	if (isString(options)) {
		fieldnames = [options];
	} else if (isArray(options)) {
		fieldnames = options;
	} else {
		fieldnames = options?.fieldnames;
		required = options?.required ?? false;
	}

	// If no fieldnames specified, return all files
	if (isUndefined(fieldnames) || isEmpty(fieldnames)) {
		if (required && files.length === 0) {
			throw new BadRequestException(`At least one file is required.`);
		}

		return files;
	}

	const matchedFiles = files.filter((file) => fieldnames.includes(file.fieldname));

	if (required) {
		const missingFields = fieldnames.filter(
			(name) => !matchedFiles.find((f) => f.fieldname === name),
		);

		if (missingFields.length > 0) {
			throw new BadRequestException(`Missing required file fields: ${missingFields.join(", ")}`);
		}
	}

	return matchedFiles;
}

export const MultipartFiles = createParamDecorator(multipartFilesFactory);
