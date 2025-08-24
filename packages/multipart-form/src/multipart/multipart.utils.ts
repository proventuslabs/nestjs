import type { Readable } from "node:stream";

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
	const wrapped = Object.defineProperties(buffer, {
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
		size: {
			value: buffer.length,
			writable: false,
			enumerable: true,
			configurable: false,
		},
	});

	return wrapped as MultipartFileBuffer;
}
