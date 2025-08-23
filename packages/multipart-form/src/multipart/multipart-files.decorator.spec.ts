import { Readable } from "node:stream";

import type { ExecutionContext } from "@nestjs/common";

import { createMock } from "@golevelup/ts-jest";
import { type Observable, of } from "rxjs";
import { TestScheduler } from "rxjs/testing";

import { MissingFilesError } from "./multipart.errors";
import type { MultipartFileStream } from "./multipart.types";
import { wrapReadableIntoMultipartFileStream } from "./multipart.utils";
import { multipartFilesFactory } from "./multipart-files.decorator";

describe("multipartFilesFactory", () => {
	let scheduler: TestScheduler;

	beforeEach(() => {
		scheduler = new TestScheduler((actual, expected) => {
			expect(actual).toEqual(expected);
		});
	});

	const mockFile = (field: string): MultipartFileStream =>
		wrapReadableIntoMultipartFileStream(
			Readable.from([]),
			field,
			`${field}.dat`,
			"7bit",
			"application/octet-stream",
		);

	const createContext = (files$: Observable<MultipartFileStream>, type: "http" | "ws" = "http") =>
		createMock<ExecutionContext>({
			getType: () => type,
			switchToHttp: () => ({
				getRequest: () => ({
					_files$: files$,
				}),
			}),
		});

	it("should return EMPTY if context type is not http", () => {
		scheduler.run(({ expectObservable }) => {
			const ctx = createContext(of(mockFile("file")), "ws");
			const result$ = multipartFilesFactory(undefined, ctx);
			expectObservable(result$).toBe("|"); // completes immediately
		});
	});

	it("should pass through all files when options is undefined", () => {
		scheduler.run(({ cold, expectObservable }) => {
			const f1 = mockFile("a");
			const f2 = mockFile("b");
			const files$ = cold("a-b-|", { a: f1, b: f2 });
			const ctx = createContext(files$);
			const result$ = multipartFilesFactory(undefined, ctx);
			expectObservable(result$).toBe("a-b-|", { a: f1, b: f2 });
		});
	});

	it("should filter and emit only required files", () => {
		scheduler.run(({ cold, expectObservable }) => {
			const doc = mockFile("document");
			const img = mockFile("image");
			const files$ = cold("a-b-|", { a: doc, b: img });
			const ctx = createContext(files$);
			const result$ = multipartFilesFactory("document", ctx);
			expectObservable(result$).toBe("a---|", { a: doc });
		});
	});

	it("should complete with error if required file is missing", () => {
		scheduler.run(({ cold, expectObservable }) => {
			const img = mockFile("image");
			const files$ = cold("a|", { a: img });
			const ctx = createContext(files$);
			const result$ = multipartFilesFactory("document", ctx);
			expectObservable(result$).toBe("-#", undefined, new MissingFilesError(["document"]));
		});
	});

	it("should accept optional fields without error", () => {
		scheduler.run(({ cold, expectObservable }) => {
			const img = mockFile("avatar");
			const files$ = cold("a-|", { a: img });
			const ctx = createContext(files$);
			const result$ = multipartFilesFactory([["avatar", false]], ctx);
			expectObservable(result$).toBe("a-|", { a: img });
		});
	});
});
