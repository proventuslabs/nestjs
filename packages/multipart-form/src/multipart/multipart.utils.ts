import type { Readable } from "node:stream";

import type { MultipartFileStream } from "./multipart.types";

/**
 * Wraps a Node.js Readable stream into a MultipartFile object with metadata.
 *
 * @internal
 * @param file The readable stream representing the file.
 * @param fieldname The field name from the multipart form.
 * @param filename The original filename of the uploaded file.
 * @param encoding The file encoding.
 * @param mimetype The MIME type of the file.
 * @returns The wrapped stream as a `MultipartFile` with readonly metadata properties.
 */
export function wrapReadableIntoMultipartFileStream(
	file: Readable,
	fieldname: string,
	filename: string,
	encoding: string,
	mimetype: string,
): MultipartFileStream {
	const wrapped = Object.defineProperties(file, {
		fieldname: {
			value: fieldname,
			writable: false,
			enumerable: true,
			configurable: false,
		},
		filename: {
			value: filename,
			writable: false,
			enumerable: true,
			configurable: false,
		},
		encoding: {
			value: encoding,
			writable: false,
			enumerable: true,
			configurable: false,
		},
		mimetype: {
			value: mimetype,
			writable: false,
			enumerable: true,
			configurable: false,
		},
	});

	return wrapped as MultipartFileStream;
}
