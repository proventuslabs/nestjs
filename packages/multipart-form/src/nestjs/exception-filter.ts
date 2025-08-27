import {
	type ArgumentsHost,
	BadRequestException,
	Catch,
	type ExceptionFilter,
	type HttpException,
	InternalServerErrorException,
	PayloadTooLargeException,
} from "@nestjs/common";

import type { Response } from "express";

import {
	FieldsLimitError,
	FilesLimitError,
	MissingFieldsError,
	MissingFilesError,
	MultipartError,
	PartsLimitError,
	TruncatedFieldError,
	TruncatedFileError,
} from "../core/errors";

/**
 * Exception filter that catches all MultipartError instances (including subclasses)
 * and transforms them into appropriate NestJS HTTP exceptions.
 *
 * Mapping:
 * - PartsLimitError, FilesLimitError, FieldsLimitError → PayloadTooLargeException (HTTP 413)
 * - TruncatedFileError, TruncatedFieldError, MissingFilesError, MissingFieldsError → BadRequestException (HTTP 400)
 * - Other MultipartError instances → InternalServerErrorException (HTTP 500)
 *
 * The original error is preserved using the `cause` property.
 */
@Catch(MultipartError)
export class MultipartExceptionFilter implements ExceptionFilter {
	catch(exception: MultipartError, host: ArgumentsHost) {
		if (host.getType() !== "http") throw exception;

		const ctx = host.switchToHttp();
		const res = ctx.getResponse<Response>();

		let httpException: HttpException;

		// map specific multipart errors to appropriate HTTP exceptions
		if (
			exception instanceof PartsLimitError ||
			exception instanceof FilesLimitError ||
			exception instanceof FieldsLimitError
		) {
			httpException = new PayloadTooLargeException(exception.message, { cause: exception });
		} else if (
			exception instanceof TruncatedFileError ||
			exception instanceof TruncatedFieldError ||
			exception instanceof MissingFilesError ||
			exception instanceof MissingFieldsError
		) {
			httpException = new BadRequestException(exception.message, { cause: exception });
		} else {
			httpException = new InternalServerErrorException(exception.message, { cause: exception });
		}

		res.status(httpException.getStatus()).json({
			statusCode: httpException.getStatus(),
			message: httpException.message,
			error: httpException.name,
		});
	}
}
