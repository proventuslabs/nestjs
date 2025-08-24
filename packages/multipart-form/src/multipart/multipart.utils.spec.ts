import { Readable } from "node:stream";

import {
	wrapBufferIntoMultipartFileBuffer,
	wrapReadableIntoMultipartFileStream,
} from "./multipart.utils";

describe("wrapReadableIntoMultipartFileStream", () => {
	it("should wrap a readable stream with multipart file metadata", () => {
		const stream = Readable.from(["test content"]);
		const fieldname = "upload";
		const filename = "test.txt";
		const encoding = "7bit";
		const mimetype = "text/plain";

		const result = wrapReadableIntoMultipartFileStream(
			stream,
			fieldname,
			filename,
			encoding,
			mimetype,
		);

		expect(result.fieldname).toBe(fieldname);
		expect(result.filename).toBe(filename);
		expect(result.encoding).toBe(encoding);
		expect(result.mimetype).toBe(mimetype);
		expect(result).toBeInstanceOf(Readable);
	});
});

describe("wrapBufferIntoMultipartFileBuffer", () => {
	it("should wrap a buffer with multipart file metadata", () => {
		const buffer = Buffer.from("test content");
		const fieldname = "upload";
		const filename = "test.txt";
		const encoding = "7bit";
		const mimetype = "text/plain";

		const result = wrapBufferIntoMultipartFileBuffer(
			buffer,
			fieldname,
			filename,
			encoding,
			mimetype,
		);

		expect(result.fieldname).toBe(fieldname);
		expect(result.filename).toBe(filename);
		expect(result.encoding).toBe(encoding);
		expect(result.mimetype).toBe(mimetype);
		expect(result.size).toBe(buffer.length);
		expect(result).toBeInstanceOf(Buffer);
		expect(result.toString()).toBe("test content");
	});

	it("should create readonly metadata properties", () => {
		const buffer = Buffer.from("test");
		const result = wrapBufferIntoMultipartFileBuffer(
			buffer,
			"field",
			"file.txt",
			"7bit",
			"text/plain",
		);

		// try to modify properties - should not work
		expect(() => {
			// @ts-expect-error - testing readonly behavior
			result.fieldname = "modified";
		}).toThrow();

		expect(() => {
			// @ts-expect-error - testing readonly behavior
			result.size = 999;
		}).toThrow();

		// original values should remain unchanged
		expect(result.fieldname).toBe("field");
		expect(result.size).toBe(4);
	});
});
