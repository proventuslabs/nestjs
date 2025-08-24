import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { Request } from "express";
import { isArray, isString } from "lodash";
import { EMPTY, type Observable } from "rxjs";

import type { MultipartField } from "./multipart.types";
import { filterFieldsByPatterns, validateRequiredFields } from "./multipart-fields.operators";

export function multipartFieldsFactory(
	options: string | (string | [fieldname: string, required?: boolean])[] | undefined,
	ctx: ExecutionContext,
): Observable<MultipartField> {
	if (ctx.getType() !== "http") return EMPTY;

	const request = ctx.switchToHttp().getRequest<Request>();
	const fields$ = request._fields$;

	if (!fields$) return EMPTY;

	let requiredPatterns: string[];
	let optionalPatterns: string[];

	if (isString(options)) {
		requiredPatterns = [options];
		optionalPatterns = [];
	} else if (isArray(options)) {
		requiredPatterns = options
			.filter((v) => isString(v) || v[1] !== false)
			.map((v) => (isString(v) ? v : v[0]));
		optionalPatterns = options
			.filter((v) => isArray(v) && v[1] === false)
			.map((v) => (isString(v) ? v : v[0]));
	} else {
		// 'undefined' - return all fields without validation
		return fields$;
	}

	const allPatterns = [...requiredPatterns, ...optionalPatterns];

	return fields$.pipe(
		filterFieldsByPatterns(allPatterns),
		validateRequiredFields(requiredPatterns),
	);
}

/**
 * Extract and validate multipart form fields from the request.
 *
 * The decorator returns an Observable that emits MultipartField objects.
 * It automatically handles field validation and will throw a MissingFieldsError if required fields are missing.
 *
 * @param options - Optional configuration for field validation. Can be:
 *   - A string: treated as a single required field name or pattern
 *   - An array of field specifications: each element can be either a string (required field/pattern)
 *     or a tuple [fieldname: string, required?: boolean] where required defaults to true
 *   - undefined: returns all fields without validation
 *
 *   Field patterns support a "starts with" syntax by prefixing with "^":
 *   - "fieldname": matches exactly "fieldname"
 *   - "^prefix_": matches any field that starts with "prefix_"
 *
 * @returns A parameter decorator that can be applied to controller method parameters
 * @throws {MissingFieldsError} When required fields are missing from the multipart form
 *
 * @example
 * ‍@Post('upload')
 * async uploadFile(
 *   ‍@MultipartFields(['file', ['description', false]]) fields: Observable<MultipartField>
 * ) {
 *   // Fields will emit each valid field as it's processed.
 *   // 'file' is required, 'description' is optional.
 *   return fields.pipe(
 *     map(field => field.name),
 *     toArray()
 *   );
 * }
 *
 * // Single required field:
 * ‍@Post('upload')
 * async uploadFile(
 *   ‍@MultipartFields('file') fields: Observable<MultipartField>
 * ) {
 *   // Only 'file' field will be emitted.
 * }
 *
 * // All fields without validation:
 * ‍@Post('upload')
 * async uploadFile(
 *   ‍@MultipartFields() fields: Observable<MultipartField>
 * ) {
 *   // All multipart fields will be emitted.
 * }
 *
 * // Using "starts with" pattern matching:
 * ‍@Post('upload')
 * async uploadFile(
 *   ‍@MultipartFields('^user_') fields: Observable<MultipartField>
 * ) {
 *   // Will emit fields like: user_name, user_email, user_avatar, etc.
 * }
 *
 * // Mixed exact and pattern matching:
 * ‍@Post('upload')
 * async uploadFile(
 *   ‍@MultipartFields(['avatar', '^user_', ['metadata', false]]) fields: Observable<MultipartField>
 * ) {
 *   // 'avatar' is required (exact match).
 *   // Any field starting with 'user_' is required.
 *   // 'metadata' is optional (exact match).
 * }
 */
export const MultipartFields = createParamDecorator(multipartFieldsFactory);
