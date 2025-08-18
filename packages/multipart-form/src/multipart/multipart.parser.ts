import type { IncomingHttpHeaders } from "node:http";
import type { Readable } from "node:stream";

import busboy from "busboy";
import { nth } from "lodash";
import { Observable, Subject } from "rxjs";

import {
	FieldsLimitError,
	FilesLimitError,
	MultipartError,
	PartsLimitError,
	TruncatedFieldError,
	TruncatedFileError,
} from "./multipart.errors";
import type { MultipartField, MultipartFileStream, MultipartOptions } from "./multipart.types";
import { wrapReadableIntoMultipartFileUpload } from "./multipart.utils";

/**
 * Wraps a file stream from Busboy into a `MultipartFile` object.
 *
 * @internal
 * @param fieldname The field name from the multipart form.
 * @param file The readable stream of the uploaded file.
 * @param info File metadata from Busboy.
 * @returns The wrapped file stream as a `MultipartFile`.
 */
export function handleFile(
	fieldname: string,
	file: Readable,
	info: busboy.FileInfo,
): MultipartFileStream {
	const { filename, encoding, mimeType } = info;

	const upload = wrapReadableIntoMultipartFileUpload(file, fieldname, filename, encoding, mimeType);

	return upload;
}

/**
 * Wraps a field from Busboy into a `MultipartField` object.
 *
 * @internal
 * @param fieldname The field name from the multipart form.
 * @param value The string value of the field.
 * @param info Field metadata from Busboy.
 * @returns The parsed field as a `MultipartField`.
 */
export function handleField(
	fieldname: string,
	value: string,
	info: busboy.FieldInfo,
): MultipartField {
	// Check for array-like field names (e.g., "items[]" or "items[0]")
	const arrayMatch = fieldname.match(/(.+)\[(\d+)?\]$/);
	const baseField = nth(arrayMatch, 1) ?? fieldname;

	return {
		name: baseField,
		value,
		mimetype: info.mimeType,
	};
}

/**
 * Parses a multipart/form-data request into streams of files and fields.
 *
 * @internal
 * @param req The HTTP request readable stream.
 * @param headers The request headers.
 * @param config Optional multipart parser configuration.
 * @returns An Observable emitting `{ files, fields }` Subjects for streaming uploads.
 */
export function parseMultipartData(
	req: Readable,
	headers: IncomingHttpHeaders,
	done$: Observable<never>,
	config?: MultipartOptions,
) {
	return new Observable<{
		files: Observable<MultipartFileStream>;
		fields: Observable<MultipartField>;
	}>((subscriber) => {
		let bb: busboy.Busboy;
		try {
			bb = busboy({ ...config, headers });
		} catch (err) {
			return subscriber.error(new MultipartError("Failed to initialize Busboy", { cause: err }));
		}

		let shouldEmitErrors = true;
		const doneSubscription = done$.subscribe({
			complete: () => {
				shouldEmitErrors = false;
			},
		});

		const files = new Subject<MultipartFileStream>();
		const fields = new Subject<MultipartField>();

		const partsLimit = config?.limits?.parts ?? Infinity;
		const filesLimit = config?.limits?.files ?? Infinity;
		const fieldsLimit = config?.limits?.fields ?? Infinity;

		const fail = (err: unknown) => {
			if (shouldEmitErrors) {
				files.error(err);
				fields.error(err);
				subscriber.error(err);
			}
		}

		bb.on("partsLimit", () => fail(new PartsLimitError(partsLimit)));

		bb.on("file", (fieldname, file, info) => {
			const incomingFile = handleFile(fieldname, file, info);
			incomingFile.once("end", () => {
				if (file.truncated) {
					const err = new TruncatedFileError(fieldname);
					incomingFile.emit("error", err); // propagate the error to the file stream too
					fail(err);
				}
			});
			files.next(incomingFile);
		});

		bb.on("filesLimit", () => fail(new FilesLimitError(filesLimit)));

		bb.on("field", (fieldname, value, info) => {
			const incomingField = handleField(fieldname, value, info);
			if (info.nameTruncated || info.valueTruncated) fail(new TruncatedFieldError(fieldname));
			else fields.next(incomingField);
		});

		bb.on("fieldsLimit", () => fail(new FieldsLimitError(fieldsLimit)));

		bb.on("finish", () => {
			files.complete();
			fields.complete();
			subscriber.complete();
		});

		bb.on("error", (err) => fail(new MultipartError("Busboy processing error", { cause: err })));

		// allow subscriber to setup
		subscriber.next({ files: files.asObservable(), fields: fields.asObservable() });

		// start processing the request
		req.pipe(bb, { end: true });

		return () => {
			doneSubscription.unsubscribe();
			req.unpipe(bb);
			bb.removeAllListeners();
		};
	});
}
