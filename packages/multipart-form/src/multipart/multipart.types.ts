import type { Readable } from "node:stream";

import type { BusboyConfig } from "busboy";
import type { Observable } from "rxjs";

/**
 * Re-export types from `busboy` for convenience.
 */
export type { BusboyConfig, Limits } from "busboy";

/**
 * Options for the multipart parser, derived from `BusboyConfig` without `headers`.
 */
export interface MultipartOptions extends Omit<BusboyConfig, "headers"> {};

/**
 * Metadata about a file uploaded in a multipart request.
 */
export interface MultipartFileData {
	/** The form field name for this file */
	readonly fieldname: string;

	/** The original filename of the uploaded file */
	readonly filename: string;

	/** The encoding type of the file */
	readonly encoding: string;

	/** The MIME type of the file */
	readonly mimetype: string;
}

/**
 * Represents a file uploaded in a multipart request.
 * Extends `Readable` stream and includes file metadata.
 */
export interface MultipartFileStream extends Readable, MultipartFileData {
	/** Indicates if the file stream was truncated due to size limits */
	truncated?: boolean;
}

/**
 * Represents a non-file field in a multipart request.
 */
export interface MultipartField {
	/** The name of the form field */
	name: string;

	/** The string value of the form field */
	value: string;

	/** The MIME type, if applicable */
	mimetype: string;
}

/**
 * Extends Express's Request object to include multipart file and field streams.
 */
declare module "express" {
	interface Request {
		/** Stream of uploaded files */
		files?: Observable<MultipartFileStream>;

		/** Stream of form fields */
		fields?: Observable<MultipartField>;

		/** @internal Files names we have subscribers created via params */
		_filesNames: string[];
	}
}
