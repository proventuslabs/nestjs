import { Readable } from "node:stream";

import { BadRequestException, type ExecutionContext } from "@nestjs/common";

import { createMock } from "@golevelup/ts-jest";

import type { MultipartFileStream } from "./multipart.types";
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

	const createMockContext = (files: MultipartFileStream[] = [], type: "http" | "ws" = "http") =>
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
});
