import { Readable } from "node:stream";

import { BadRequestException, type ExecutionContext } from "@nestjs/common";

import { createMock } from "@golevelup/ts-jest";

import type { MultipartFileUpload } from "./multipart.types";
import { wrapReadableIntoMultipartFileUpload } from "./multipart.utils";
import { multipartFileFactory } from "./multipart-file.decorator";

describe("MultipartFile (Decorator)", () => {
	const mockFile1 = wrapReadableIntoMultipartFileUpload(
		Readable.from([]),
		"document",
		"doc.pdf",
		"7bit",
		"application/pdf",
	);

	const mockFile2 = wrapReadableIntoMultipartFileUpload(
		Readable.from([]),
		"image",
		"pic.jpg",
		"7bit",
		"image/jpeg",
	);

	const createMockContext = (files: MultipartFileUpload[] = [], type: "http" | "ws" = "http") =>
		createMock<ExecutionContext>({
			getType: () => type,
			switchToHttp: () => ({
				getRequest: () => ({
					files,
				}),
			}),
		});

	it("should return the file when a single file is found and required (default)", () => {
		const ctx = createMockContext([mockFile1]);

		const file = multipartFileFactory("document", ctx);
		expect(file).toBe(mockFile1);
	});

	it("should throw BadRequestException when a required file (default) is not found", () => {
		const ctx = createMockContext([mockFile2]);

		expect(() => {
			multipartFileFactory("document", ctx);
		}).toThrow(BadRequestException);
		expect(() => {
			multipartFileFactory("document", ctx);
		}).toThrow('File "document" is required.');
	});

	it("should return the file when options specify required: true and file is found", () => {
		const ctx = createMockContext([mockFile1]);

		const file = multipartFileFactory({ fieldname: "document", required: true }, ctx);
		expect(file).toBe(mockFile1);
	});

	it("should throw BadRequestException when options specify required: true and file is not found", () => {
		const ctx = createMockContext([mockFile2]);

		expect(() => {
			multipartFileFactory({ fieldname: "document", required: true }, ctx);
		}).toThrow(BadRequestException);
		expect(() => {
			multipartFileFactory({ fieldname: "document", required: true }, ctx);
		}).toThrow('File "document" is required.');
	});

	it("should return the file when options specify required: false and file is found", () => {
		const ctx = createMockContext([mockFile1]);

		const file = multipartFileFactory({ fieldname: "document", required: false }, ctx);
		expect(file).toBe(mockFile1);
	});

	it("should return undefined when options specify required: false and file is not found", () => {
		const ctx = createMockContext([mockFile2]);

		const file = multipartFileFactory({ fieldname: "document", required: false }, ctx);
		expect(file).toBeUndefined();
	});

	it("should handle an empty files array gracefully when file is not required", () => {
		const ctx = createMockContext([]);

		const file = multipartFileFactory({ fieldname: "document", required: false }, ctx);
		expect(file).toBeUndefined();
	});

	it("should throw BadRequestException when an empty files array is provided and file is required (default)", () => {
		const ctx = createMockContext([]);

		expect(() => {
			multipartFileFactory("document", ctx);
		}).toThrow(BadRequestException);
		expect(() => {
			multipartFileFactory("document", ctx);
		}).toThrow('File "document" is required.');
	});

	it("should return undefined if context type is not http", () => {
		const ctx = createMockContext([mockFile2], "ws");

		const file = multipartFileFactory("document", ctx);
		expect(file).toBeUndefined();
	});

	it("should find the correct file among multiple files", () => {
		const ctx = createMockContext([mockFile1, mockFile2]);

		const file = multipartFileFactory("image", ctx);
		expect(file).toBe(mockFile2);
	});
});
