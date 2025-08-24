import type { Readable } from "node:stream";

import { isArray, isString } from "lodash";

import type { MultipartFileBuffer, MultipartFileStream } from "./multipart.types";

/**
 * @internal
 * Wraps a Node.js Readable stream into a MultipartFileStream object with metadata.
 *
 * @param file The readable stream representing the file
 * @param fieldname The field name from the multipart form
 * @param filename The original filename of the uploaded file
 * @param encoding The file encoding
 * @param mimetype The MIME type of the file
 * @returns The wrapped stream as a `MultipartFileStream` with readonly metadata properties
 */
export function wrapReadableIntoMultipartFileStream(
	file: Readable,
	fieldname: string,
	filename: string,
	encoding: string,
	mimetype: string,
): MultipartFileStream {
	const properties = { fieldname, filename, encoding, mimetype };
	const descriptors = Object.fromEntries(
		Object.entries(properties).map(([key, value]) => [
			key,
			{ value, writable: false, enumerable: true, configurable: false },
		]),
	);

	return Object.defineProperties(file, descriptors) as MultipartFileStream;
}

/**
 * @internal
 * Wraps a Buffer into a MultipartFileBuffer object with metadata.
 *
 * @param buffer The buffer containing the file data
 * @param fieldname The field name from the multipart form
 * @param filename The original filename of the uploaded file
 * @param encoding The file encoding
 * @param mimetype The MIME type of the file
 * @returns The wrapped buffer as a `MultipartFileBuffer` with readonly metadata properties
 */
export function wrapBufferIntoMultipartFileBuffer(
	buffer: Buffer,
	fieldname: string,
	filename: string,
	encoding: string,
	mimetype: string,
): MultipartFileBuffer {
	const properties = { fieldname, filename, encoding, mimetype, size: buffer.length };
	const descriptors = Object.fromEntries(
		Object.entries(properties).map(([key, value]) => [
			key,
			{ value, writable: false, enumerable: true, configurable: false },
		]),
	);

	return Object.defineProperties(buffer, descriptors) as MultipartFileBuffer;
}

/**
 * @internal
 * Parses decorator options into required and optional field/file names.
 *
 * @param options The options passed to the decorator
 * @returns Object with required and optional arrays, and all combined
 */
export function parseDecoratorOptions(
	options: string | (string | [fieldname: string, required?: boolean])[] | undefined,
): { required: string[]; optional: string[]; all: string[] } {
	if (isString(options)) {
		return { required: [options], optional: [], all: [options] };
	}

	if (isArray(options)) {
		const required = options
			.filter((v) => isString(v) || v[1] !== false)
			.map((v) => (isString(v) ? v : v[0]));
		const optional = options
			.filter((v) => isArray(v) && v[1] === false)
			.map((v) => (isString(v) ? v : v[0]));
		return { required, optional, all: [...required, ...optional] };
	}

	// undefined case - handled by callers
	return { required: [], optional: [], all: [] };
}
