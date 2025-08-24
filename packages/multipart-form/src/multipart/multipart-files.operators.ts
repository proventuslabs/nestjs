import { buffer } from "node:stream/consumers";

import { filter, from, map, mergeMap, Observable, tap } from "rxjs";

import { MissingFilesError } from "./multipart.errors";
import type { MultipartFileBuffer, MultipartFileStream } from "./multipart.types";
import { wrapBufferIntoMultipartFileBuffer } from "./multipart.utils";

/**
 * RxJS operator that filters multipart files by field names and auto-drains unwanted streams.
 *
 * @param fieldNames Array of field names to include
 * @returns RxJS operator function that filters MultipartFileStream observables
 *
 * @example
 * files$.pipe(
 *   filterFilesByFieldNames(['document', 'avatar', 'thumbnail'])
 * ).subscribe(file => console.log('Matched file:', file.fieldname));
 */
export function filterFilesByFieldNames(fieldNames: string[]) {
	return (source: Observable<MultipartFileStream>): Observable<MultipartFileStream> => {
		const fieldSet = new Set(fieldNames);

		return source.pipe(
			tap((stream) => {
				// auto-drain unwanted streams
				if (!fieldSet.has(stream.fieldname)) stream.resume();
			}),
			filter((stream) => fieldSet.has(stream.fieldname)),
		);
	};
}

/**
 * RxJS operator that validates required file field names are present when stream completes.
 *
 * @param requiredFieldNames Array of required file field names
 * @returns RxJS operator function that validates MultipartFileStream observables
 *
 * @example
 * files$.pipe(
 *   filterFilesByFieldNames(['document', 'avatar', 'thumbnail']),
 *   validateRequiredFiles(['document', 'avatar'])
 * ).subscribe(file => console.log('Valid file:', file.fieldname));
 */
export function validateRequiredFiles(requiredFieldNames: string[]) {
	return (source: Observable<MultipartFileStream>): Observable<MultipartFileStream> => {
		return new Observable<MultipartFileStream>((subscriber) => {
			const required = new Set(requiredFieldNames);

			const subscription = source
				.pipe(
					tap((stream) => {
						required.delete(stream.fieldname);
					}),
				)
				.subscribe({
					next: (stream) => subscriber.next(stream),
					error: (err) => subscriber.error(err),
					complete: () => {
						// check for missing REQUIRED files when upstream completes
						if (required.size > 0) {
							subscriber.error(new MissingFilesError(Array.from(required)));
						} else {
							subscriber.complete();
						}
					},
				});

			return () => subscription.unsubscribe();
		});
	};
}

/**
 * RxJS operator that converts file streams to buffers with metadata.
 *
 * @returns RxJS operator function that converts MultipartFileStream observables to MultipartFileBuffer
 *
 * @example
 * files$.pipe(
 *   bufferFiles()
 * ).subscribe(file => {
 *   console.log(`File: ${file.filename}, Size: ${file.size} bytes`);
 *   // Process file as Buffer (file extends Buffer)
 *   const data = file.toString('utf8');
 * });
 */
export function bufferFiles() {
	return (source: Observable<MultipartFileStream>): Observable<MultipartFileBuffer> => {
		return source.pipe(
			mergeMap((file) =>
				from(buffer(file)).pipe(
					map((buf) =>
						wrapBufferIntoMultipartFileBuffer(
							buf,
							file.fieldname,
							file.filename,
							file.encoding,
							file.mimetype,
						),
					),
				),
			),
		);
	};
}
