import type { IncomingHttpHeaders } from "node:http";
import type { Readable } from "node:stream";

import busboy, { type Busboy, type BusboyHeaders } from "@fastify/busboy";
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
import { wrapReadableIntoMultipartFileStream } from "./multipart.utils";

/**
 * Parses a multipart/form-data request into streams of files and fields.
 *
 * @internal
 * @param req The HTTP request readable stream.
 * @param headers The request headers.
 * @param upstreamExecutionDone$ Observable that when completed signals that upstream execution has been completed.
 * @param options Optional multipart parser configuration.
 * @returns An Observable emitting `{ files, fields }` observables for streaming uploads.
 */
export function parseMultipartData(
	req: Readable,
	headers: IncomingHttpHeaders,
	upstreamExecutionDone$: Observable<never>,
	options?: MultipartOptions,
) {
	req.pause(); // We pause the stream as we attach an observable that will need a subscription.

	return new Observable<{
		files: Observable<MultipartFileStream>;
		fields: Observable<MultipartField>;
	}>((subscriber) => {
		let bb: Busboy;
		try {
			bb = busboy({ ...options, headers: headers as unknown as BusboyHeaders });
		} catch (err) {
			return subscriber.error(new MultipartError("Failed to initialize Busboy", { cause: err }));
		}

		const files = new Subject<MultipartFileStream>();
		const fields = new Subject<MultipartField>();

		const partsLimit = options?.limits?.parts ?? Infinity;
		const filesLimit = options?.limits?.files ?? Infinity;
		const fieldsLimit = options?.limits?.fields ?? Infinity;

		let shouldEmitErrors = true;
		const upstreamExecutionDoneSub = upstreamExecutionDone$.subscribe({
			complete: () => {
				shouldEmitErrors = options?.bubbleErrors !== true;
			},
		});

		const fail = (err: unknown) => {
			if (shouldEmitErrors) {
				files.error(err);
				fields.error(err);
				subscriber.error(err);
			}
		};

		bb.on("partsLimit", () => fail(new PartsLimitError(partsLimit)));

		bb.on("file", (fieldname, file, filename, transferEncoding, mimeType) => {
			const incomingFile = wrapReadableIntoMultipartFileStream(
				file,
				fieldname,
				filename,
				transferEncoding,
				mimeType,
			);
			incomingFile.once("end", () => {
				if (file.truncated) {
					const err = new TruncatedFileError(fieldname);
					incomingFile.emit("error", err); // Propagate the error to the file stream too.
					fail(err);
				}
			});
			files.next(incomingFile);
		});

		bb.on("filesLimit", () => fail(new FilesLimitError(filesLimit)));

		bb.on(
			"field",
			(fieldname, value, fieldnameTruncated, valueTruncated, transferEncoding, mimeType) => {
				const incomingField: MultipartField = {
					name: fieldname,
					value,
					mimetype: mimeType,
					encoding: transferEncoding,
				};

				if (fieldnameTruncated || valueTruncated) fail(new TruncatedFieldError(fieldname));
				else fields.next(incomingField);
			},
		);

		bb.on("fieldsLimit", () => fail(new FieldsLimitError(fieldsLimit)));

		bb.on("finish", () => {
			files.complete();
			fields.complete();
			subscriber.complete();
		});

		bb.on("error", (err) => fail(new MultipartError("Busboy processing error", { cause: err })));

		// Allow subscriber to setup.
		subscriber.next({ files: files.asObservable(), fields: fields.asObservable() });

		// Add an error handler in case the upstream throws.
		req.on("error", (err) => fail(new MultipartError("Request stream errored", { cause: err })));

		// Start processing the request.
		req.pipe(bb, { end: true });
		req.resume();

		return () => {
			upstreamExecutionDoneSub.unsubscribe();
			req.unpipe(bb);
			bb.removeAllListeners();
		};
	});
}
