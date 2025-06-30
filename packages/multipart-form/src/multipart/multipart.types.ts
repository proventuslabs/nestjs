import type { Readable } from "node:stream";

export type MultipartFields = Record<string, string | string[]>;

export interface MultipartFileData {
	readonly fieldname: string;
	readonly filename: string;
	readonly encoding: string;
	readonly mimetype: string;
}

export interface MultipartFileUpload extends Readable, MultipartFileData {
	fields: MultipartFields
}

declare module "express" {
	interface Request {
		files?: MultipartFileUpload[];
	}
}
