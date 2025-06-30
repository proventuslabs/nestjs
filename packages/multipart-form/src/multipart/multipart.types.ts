import type { Readable } from "node:stream";

export type MultipartFields = Record<string, string | string[]>;

export interface MultipartFileUpload extends Readable {
	readonly fieldname: string;
	readonly filename: string;
	readonly encoding: string;
	readonly mimetype: string;
}

declare module "express" {
	interface Request {
		files?: MultipartFileUpload[];
	}
}
