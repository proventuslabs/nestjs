import type { IncomingHttpHeaders } from "node:http";
import { PassThrough, type Readable } from "node:stream";

import busboy, { type BusboyConfig } from "busboy";
import { isArray, isNull, isString, nth } from "lodash";

import type { MultipartFields, MultipartFileUpload } from "./multipart.types";
import { wrapReadableIntoMultipartFileUpload } from "./multipart.utils";

export function handleFile(
	fieldname: string,
	file: Readable,
	truncated: boolean,
	info: busboy.FileInfo,
	files: MultipartFileUpload[],
	fields: MultipartFields,
	config?: Omit<BusboyConfig, "headers">,
): void {
	const { filename, encoding, mimeType } = info;

	if (truncated) {
		file.resume();
		return;
	}

	// Duplicate the stream to make sure we consume and do not hang busboy
	const tee = file.pipe(
		new PassThrough({
			autoDestroy: true,
			emitClose: true,
			highWaterMark: config?.fileHwm,
		}),
	);
	const upload = wrapReadableIntoMultipartFileUpload(
		tee,
		fieldname,
		filename,
		encoding,
		mimeType,
		fields,
	);
	files.push(upload);
}

export function handleField(
	fieldname: string,
	value: string,
	info: busboy.FieldInfo,
	fields: MultipartFields,
): void {
	if (info.nameTruncated || info.valueTruncated) return;

	// Check for array-like field names (e.g., "items[]" or "items[0]")
	const arrayMatch = fieldname.match(/(.+)\[(\d+)?\]$/);
	const baseField = nth(arrayMatch, 1) ?? fieldname;

	const existingField = fields[baseField];
	if (isArray(existingField)) existingField.push(value);
	else if (isString(existingField)) fields[baseField] = value;
	else if (!isNull(arrayMatch)) fields[baseField] = [value];
	else fields[baseField] = value;
}

export async function parseMultipartData(
	req: Readable,
	headers: IncomingHttpHeaders,
	config?: Omit<BusboyConfig, "headers">,
): Promise<[MultipartFileUpload[], MultipartFields]> {
	return new Promise((resolve, reject) => {
		const files: MultipartFileUpload[] = [];
		const fields: MultipartFields = {};

		let bb: busboy.Busboy;
		try {
			bb = busboy({ ...config, headers });
		} catch (err) {
			return reject(err);
		}

		const cleanup = () => req.unpipe(bb);

		bb.on("file", (fieldname, file, info) => {
			handleFile(fieldname, file, file.truncated ?? false, info, files, fields, config);
		});

		bb.on("field", (fieldname, value, info) => {
			handleField(fieldname, value, info, fields);
		});

		bb.on("finish", () => {
			cleanup();
			resolve([files, fields]);
		});

		bb.on("error", (err) => {
			cleanup();
			reject(err);
		});

		req.pipe(bb);
	});
}
