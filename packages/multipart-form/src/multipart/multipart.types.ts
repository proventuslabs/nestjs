import type { Readable } from "node:stream";

import type { BusboyConfig } from "@fastify/busboy";
import type { Observable } from "rxjs";

/**
 * Re-export types from `busboy` for convenience.
 */
export type { BusboyConfig } from "@fastify/busboy";

/**
 * Re-export types from `qs` for convenience.
 */
import type * as Qs from "qs";
export type { Qs };

/**
 * Options for the multipart parser, derived from `BusboyConfig` without `headers`.
 */
export interface MultipartOptions extends Omit<BusboyConfig, "headers"> {
	/** True to bubble errors from the request _after_ the controller has ended. */
	bubbleErrors?: boolean;

	/**
	 * False will disable auto draining of unread files.
	 *
	 * **WARNING**: You are responsible to consume all files streams or busboy will **deadlock**!
	 */
	autodrain?: boolean;
}

/**
 * Metadata about a file uploaded in a multipart request.
 */
export interface MultipartFileData {
	/** The form field name for this file. */
	fieldname: string;

	/** The original filename of the uploaded file. */
	filename: string;

	/** The MIME type, otherwise empty. */
	mimetype: string;

	/** The multipart-form encoding of the file. */
	encoding: string;
}

/**
 * Represents a file uploaded in a multipart request.
 * Extends `Readable` stream and includes file metadata.
 */
export interface MultipartFileStream extends Readable, MultipartFileData {
	/** Indicates if the file stream was truncated due to size limits (best checked at the end of the stream). */
	truncated?: boolean;
}

/**
 * Base properties shared by all multipart fields.
 */
interface MultipartFieldBase {
	/** The full original name of the form field. */
	name: string;

	/** The value of the form field. */
	value: string;

	/** The MIME type, empty if not a file. */
	mimetype: string;

	/** The multipart-form encoding of the field. */
	encoding: string;
}

/**
 * Non-associative multipart field.
 */
interface MultipartNonAssociativeField extends MultipartFieldBase {
	/** Whether this field should be treated as associative. */
	isAssociative?: false;

	/** The base field name without associative syntax. */
	basename?: string;

	/** The associations if specified (e.g., field[0] or field[test]). */
	associations?: string[];
}

/**
 * Associative multipart field.
 */
interface MultipartAssociativeField extends MultipartFieldBase {
	/** Whether this field should be treated as associative. */
	isAssociative: true;

	/** The base field name without associative syntax. */
	basename: string;

	/** The associations if specified (e.g., field[0] or field[test]). */
	associations: string[];
}

/**
 * Represents a non-file field in a multipart request.
 */
export type MultipartField = MultipartNonAssociativeField | MultipartAssociativeField;

/**
 * Extends http request object to include multipart file and field streams.
 */
declare module "http" {
	interface IncomingMessage {
		/** @internal Stream of uploaded files for internal subs. Use decorator instead `@MultipartFiles()`. */
		_files$?: Observable<MultipartFileStream>;

		/** @internal Stream of form fields for internal subs. Use decorator instead `@MultipartFields()`. */
		_fields$?: Observable<MultipartField>;
	}
}
