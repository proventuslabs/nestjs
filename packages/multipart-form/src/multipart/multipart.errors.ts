/**
 * Base class for all multipart-related errors.
 * Extends the native `Error` object.
 */
export class MultipartError extends Error {
	/**
	 * @param message - A descriptive error message
	 * @param options - Optional error options
	 * @param options.cause - The original cause of the error
	 */
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = this.constructor.name;
	}
}

/**
 * Thrown when the total number of parts in a multipart request exceeds the configured limit.
 */
export class PartsLimitError extends MultipartError {
	/**
	 * @param limit - The maximum allowed number of parts
	 * @param options - Optional error options
	 */
	constructor(limit: number, options?: { cause?: unknown }) {
		super(`Parts limit of ${limit} reached`, options);
	}
}

/**
 * Thrown when the number of uploaded files exceeds the configured limit.
 */
export class FilesLimitError extends MultipartError {
	/**
	 * @param limit - The maximum allowed number of files
	 * @param options - Optional error options
	 */
	constructor(limit: number, options?: { cause?: unknown }) {
		super(`Files limit of ${limit} reached`, options);
	}
}

/**
 * Thrown when the number of fields in a multipart request exceeds the configured limit.
 */
export class FieldsLimitError extends MultipartError {
	/**
	 * @param limit - The maximum allowed number of fields
	 * @param options - Optional error options
	 */
	constructor(limit: number, options?: { cause?: unknown }) {
		super(`Fields limit of ${limit} reached`, options);
	}
}

/**
 * Thrown when a file was truncated during upload, usually due to size limits.
 */
export class TruncatedFileError extends MultipartError {
	/**
	 * @param fieldname - The form field name of the truncated file
	 * @param options - Optional error options
	 */
	constructor(fieldname: string, options?: { cause?: unknown }) {
		super(`File field "${fieldname}" was truncated during upload`, options);
	}
}

/**
 * Thrown when a form field was truncated during upload, usually due to size limits.
 */
export class TruncatedFieldError extends MultipartError {
	/**
	 * @param fieldname - The name of the truncated form field
	 * @param options - Optional error options
	 */
	constructor(fieldname: string, options?: { cause?: unknown }) {
		super(`Field "${fieldname}" was truncated during upload`, options);
	}
}

/**
 * Thrown when files are missing from the request.
 */
export class MissingFilesError extends MultipartError {
	/**
	 * @param fieldnames - The missing form file field name
	 * @param options - Optional error options
	 */
	constructor(fieldnames: string[], options?: { cause?: unknown }) {
		super(`Missing files: ${fieldnames.join(", ")}`, options);
	}
}

/**
 * Thrown when fields are missing from the request.
 */
export class MissingFieldsError extends MultipartError {
	/**
	 * @param fieldnames - The missing form file field name
	 * @param options - Optional error options
	 */
	constructor(fieldnames: string[], options?: { cause?: unknown }) {
		super(`Missing fields: ${fieldnames.join(", ")}`, options);
	}
}
