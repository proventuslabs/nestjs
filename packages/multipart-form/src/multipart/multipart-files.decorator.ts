import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { Request } from "express";
import { isArray, isString } from "lodash";
import { EMPTY, type Observable } from "rxjs";

import type { MultipartFileStream } from "./multipart.types";
import { filterFilesByFieldNames, validateRequiredFiles } from "./multipart-files.operators";

export function multipartFilesFactory(
	options: string | (string | [fieldname: string, required?: boolean])[] | undefined,
	ctx: ExecutionContext,
): Observable<MultipartFileStream> {
	if (ctx.getType() !== "http") return EMPTY;

	const request = ctx.switchToHttp().getRequest<Request>();
	const files$ = request._files$;

	if (!files$) return EMPTY;

	let required: string[];
	let optional: string[];

	if (isString(options)) {
		required = [options];
		optional = [];
	} else if (isArray(options)) {
		required = options
			.filter((v) => isString(v) || v[1] !== false)
			.map((v) => (isString(v) ? v : v[0]));
		optional = options
			.filter((v) => isArray(v) && v[1] === false)
			.map((v) => (isString(v) ? v : v[0]));
	} else {
		// 'undefined' - return all files without validation
		return files$;
	}

	const allFieldNames = [...required, ...optional];

	return files$.pipe(filterFilesByFieldNames(allFieldNames), validateRequiredFiles(required));
}

/**
 * Extract and validate multipart form file uploads from the request.
 *
 * The decorator returns an Observable that emits MultipartFileStream objects.
 * It automatically handles file field validation and will throw a MissingFilesError if required file fields are missing.
 *
 * @param options - Optional configuration for file field validation. Can be:
 *   - A string: treated as a single required file field name
 *   - An array of field specifications: each element can be either a string (required field)
 *     or a tuple [fieldname: string, required?: boolean] where required defaults to true
 *   - undefined: returns all file fields without validation
 *
 * @returns A parameter decorator that can be applied to controller method parameters
 * @throws {MissingFilesError} When required file fields are missing from the multipart form
 *
 * @example
 * ‍@Post('upload')
 * async uploadFiles(
 *   ‍@MultipartFiles(['document', ['avatar', false]]) files: Observable<MultipartFileStream>
 * ) {
 *   // Files will emit each valid file stream as it's processed.
 *   // 'document' is required, 'avatar' is optional.
 *   return files.pipe(
 *     map(file => file.fieldname),
 *     toArray()
 *   );
 * }
 *
 * // Single required file field:
 * ‍@Post('upload')
 * async uploadFile(
 *   ‍@MultipartFiles('file') files: Observable<MultipartFileStream>
 * ) {
 *   // Only 'file' field will be emitted.
 * }
 *
 * // All file fields without validation:
 * ‍@Post('upload')
 * async uploadFiles(
 *   ‍@MultipartFiles() files: Observable<MultipartFileStream>
 * ) {
 *   // All multipart file fields will be emitted.
 * }
 */
export const MultipartFiles = createParamDecorator(multipartFilesFactory);
