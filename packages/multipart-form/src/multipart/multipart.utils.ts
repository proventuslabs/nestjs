import type { Readable } from "node:stream";

import type { MultipartFields, MultipartFileUpload } from "./multipart.types";

export function wrapReadableIntoMultipartFileUpload(
	file: Readable,
	fieldname: string,
	filename: string,
	encoding: string,
	mimetype: string,
	fields: MultipartFields,
): MultipartFileUpload {
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
		fields: {
			value: fields,
			writable: false,
			enumerable: true,
			configurable: false,
		},
	});

	return wrapped as MultipartFileUpload;
}
