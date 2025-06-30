import { Readable } from "node:stream";

import { BadRequestException, type ExecutionContext } from "@nestjs/common";

import { createMock } from "@golevelup/ts-jest";

import type { MultipartFileUpload } from "./multipart.types";
import { wrapReadableIntoMultipartFileUpload } from "./multipart.utils";
import { multipartFilesFactory } from "./multipart-files.decorator";

describe("MultipartFiles (Decorator)", () => {
	const mockFile1 = wrapReadableIntoMultipartFileUpload(
		Readable.from([]),
		"document",
		"doc.pdf",
		"7bit",
		"application/pdf",
		{}
	);

	const mockFile2 = wrapReadableIntoMultipartFileUpload(
		Readable.from([]),
		"image",
		"pic.jpg",
		"7bit",
		"image/jpeg",
		{}
	);

	const mockFile3 = wrapReadableIntoMultipartFileUpload(
		Readable.from([]),
		"another_doc",
		"another_doc.txt",
		"7bit",
		"text/plain",
		{}
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

	it("should return all files when no options are specified and files are present", () => {
		const ctx = createMockContext([mockFile1, mockFile2]);
		const files = multipartFilesFactory(undefined, ctx);

		expect(files).toEqual([mockFile1, mockFile2]);
	});

	it("should return an empty array when no options are specified and no files are present", () => {
		const ctx = createMockContext([]);
		const files = multipartFilesFactory(undefined, ctx);

		expect(files).toEqual([]);
	});

	it("should throw BadRequestException when no options are specified, no files are present, and required is true (default)", () => {
		const ctx = createMockContext([]);

		expect(() => {
			multipartFilesFactory({ required: true }, ctx);
		}).toThrow(BadRequestException);

		expect(() => {
			multipartFilesFactory({ required: true }, ctx);
		}).toThrow("At least one file is required.");
	});

	it("should return files matching a single fieldname string and required (default)", () => {
		const ctx = createMockContext([mockFile1, mockFile2]);
		const files = multipartFilesFactory("document", ctx);

		expect(files).toEqual([mockFile1]);
	});

	it("should throw BadRequestException when a single fieldname string is required (default) but not found", () => {
		const ctx = createMockContext([mockFile2]);

		expect(() => {
			multipartFilesFactory("document", ctx);
		}).toThrow(BadRequestException);

		expect(() => {
			multipartFilesFactory("document", ctx);
		}).toThrow("Missing required file fields: document");
	});

	it("should return files matching multiple fieldnames (array of strings) and required (default)", () => {
		const ctx = createMockContext([mockFile1, mockFile2, mockFile3]);
		const files = multipartFilesFactory(["document", "image"], ctx);

		expect(files).toEqual([mockFile1, mockFile2]);
	});

	it("should throw BadRequestException when multiple fieldnames are required (default) but some are missing", () => {
		const ctx = createMockContext([mockFile1]);

		expect(() => {
			multipartFilesFactory(["document", "image"], ctx);
		}).toThrow(BadRequestException);

		expect(() => {
			multipartFilesFactory(["document", "image"], ctx);
		}).toThrow("Missing required file fields: image");
	});

	it("should throw BadRequestException when multiple fieldnames are required (default) but all are missing", () => {
		const ctx = createMockContext([mockFile3]);

		expect(() => {
			multipartFilesFactory(["document", "image"], ctx);
		}).toThrow(BadRequestException);

		expect(() => {
			multipartFilesFactory(["document", "image"], ctx);
		}).toThrow("Missing required file fields: document, image");
	});

	it("should return files matching fieldnames specified in options object with required: true", () => {
		const ctx = createMockContext([mockFile1, mockFile2]);
		const files = multipartFilesFactory({ fieldnames: ["document", "image"], required: true }, ctx);

		expect(files).toEqual([mockFile1, mockFile2]);
	});

	it("should throw BadRequestException when required: true in options and some fieldnames are missing", () => {
		const ctx = createMockContext([mockFile1]);

		expect(() => {
			multipartFilesFactory({ fieldnames: ["document", "image"], required: true }, ctx);
		}).toThrow(BadRequestException);

		expect(() => {
			multipartFilesFactory({ fieldnames: ["document", "image"], required: true }, ctx);
		}).toThrow("Missing required file fields: image");
	});

	it("should return files matching fieldnames specified in options object with required: false", () => {
		const ctx = createMockContext([mockFile1, mockFile2]);
		const files = multipartFilesFactory(
			{ fieldnames: ["document", "another_doc"], required: false },
			ctx,
		);

		expect(files).toEqual([mockFile1]); // Only document is present
	});

	it("should return an empty array when required: false in options and no matching fieldnames are found", () => {
		const ctx = createMockContext([mockFile2]);
		const files = multipartFilesFactory(
			{ fieldnames: ["document", "another_doc"], required: false },
			ctx,
		);

		expect(files).toEqual([]);
	});

	it("should return an empty array when required: false in options and no files are present at all", () => {
		const ctx = createMockContext([]);
		const files = multipartFilesFactory({ fieldnames: ["document"], required: false }, ctx);

		expect(files).toEqual([]);
	});

	it("should return all files if fieldnames array is empty in options and files are present", () => {
		const ctx = createMockContext([mockFile1, mockFile2]);
		const files = multipartFilesFactory({ fieldnames: [], required: false }, ctx);

		expect(files).toEqual([mockFile1, mockFile2]);
	});

	it("should return an empty array if fieldnames array is empty in options and no files are present", () => {
		const ctx = createMockContext([]);
		const files = multipartFilesFactory({ fieldnames: [], required: false }, ctx);

		expect(files).toEqual([]);
	});

	it("should throw BadRequestException if fieldnames array is empty in options, no files are present, and required: true", () => {
		const ctx = createMockContext([]);

		expect(() => {
			multipartFilesFactory({ fieldnames: [], required: true }, ctx);
		}).toThrow(BadRequestException);

		expect(() => {
			multipartFilesFactory({ fieldnames: [], required: true }, ctx);
		}).toThrow("At least one file is required.");
	});

	it("should return an empty array if context type is not http", () => {
		const ctx = createMockContext([mockFile1], "ws");
		const files = multipartFilesFactory("document", ctx);

		expect(files).toEqual([]);
	});
});
