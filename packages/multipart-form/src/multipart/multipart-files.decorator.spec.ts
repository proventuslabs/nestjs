import { Readable } from "node:stream";

import type { ExecutionContext } from "@nestjs/common";

import { createMock } from "@golevelup/ts-jest";

import type { MultipartFileStream } from "./multipart.types";
import { wrapReadableIntoMultipartFileUpload } from "./multipart.utils";
import { multipartFilesFactory } from "./multipart-files.decorator";

describe("MultipartFiles (Decorator)", () => {
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

	const createMockContext = (files: MultipartFileStream[] = [], type: "http" | "ws" = "http") =>
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
});
