/** biome-ignore-all lint/style/noNonNullAssertion: we use arrays to create sources and we know inline that [0] is not undefined */
import { Readable } from "node:stream";

import { of } from "rxjs";
import { TestScheduler } from "rxjs/testing";

import { MissingFilesError } from "./multipart.errors";
import type { MultipartFileBuffer, MultipartFileStream } from "./multipart.types";
import { wrapReadableIntoMultipartFileStream } from "./multipart.utils";
import {
	bufferFiles,
	filterFilesByFieldNames,
	validateRequiredFiles,
} from "./multipart-files.operators";

describe("multipart-files.operators", () => {
	let testScheduler: TestScheduler;

	beforeEach(() => {
		testScheduler = new TestScheduler((actual, expected) => {
			expect(actual).toEqual(expected);
		});
	});

	function createMockFileStream(
		fieldname: string,
		filename: string,
		content = "test",
	): MultipartFileStream {
		const stream = Readable.from([content]);
		return wrapReadableIntoMultipartFileStream(stream, fieldname, filename, "7bit", "text/plain");
	}

	describe("filterFilesByFieldNames", () => {
		it("should filter files by field names", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const files: MultipartFileStream[] = [
					createMockFileStream("document", "doc.pdf"),
					createMockFileStream("avatar", "photo.jpg"),
					createMockFileStream("thumbnail", "thumb.png"),
				];

				const source$ = cold("(abc|)", {
					a: files[0]!,
					b: files[1]!,
					c: files[2]!,
				});

				const expected = "(ab|)";
				const expectedValues = {
					a: files[0]!,
					b: files[1]!,
				};

				expectObservable(source$.pipe(filterFilesByFieldNames(["document", "avatar"]))).toBe(
					expected,
					expectedValues,
				);
			});
		});

		it("should auto-drain unwanted streams", (done) => {
			const unwantedFile = createMockFileStream("unwanted", "unwanted.txt");
			const wantedFile = createMockFileStream("wanted", "wanted.txt");

			// spy on resume to verify auto-drain
			const resumeSpy = jest.spyOn(unwantedFile, "resume").mockImplementation(() => unwantedFile);

			const source$ = of(unwantedFile, wantedFile);
			const result$ = source$.pipe(filterFilesByFieldNames(["wanted"]));

			const receivedFiles: MultipartFileStream[] = [];

			result$.subscribe({
				next: (file) => receivedFiles.push(file),
				complete: () => {
					try {
						// verify only wanted file was emitted
						expect(receivedFiles).toHaveLength(1);
						expect(receivedFiles[0]!.fieldname).toBe("wanted");

						// verify unwanted stream was drained
						expect(resumeSpy).toHaveBeenCalled();

						done();
					} catch (error) {
						done(error);
					}
				},
				error: done,
			});
		});

		it("should pass no files when no field names match", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const files: MultipartFileStream[] = [
					createMockFileStream("document", "doc.pdf"),
					createMockFileStream("avatar", "photo.jpg"),
				];

				const source$ = cold("(ab|)", {
					a: files[0]!,
					b: files[1]!,
				});

				const expected = "|";

				expectObservable(source$.pipe(filterFilesByFieldNames(["nonexistent"]))).toBe(expected);
			});
		});

		it("should handle empty field names array", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const files: MultipartFileStream[] = [createMockFileStream("document", "doc.pdf")];

				const source$ = cold("(a|)", {
					a: files[0]!,
				});

				const expected = "|";

				expectObservable(source$.pipe(filterFilesByFieldNames([]))).toBe(expected);
			});
		});
	});

	describe("validateRequiredFiles", () => {
		it("should pass through all files when all required field names are present", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const files: MultipartFileStream[] = [
					createMockFileStream("document", "doc.pdf"),
					createMockFileStream("avatar", "photo.jpg"),
				];

				const source$ = cold("(ab|)", {
					a: files[0]!,
					b: files[1]!,
				});

				const expected = "(ab|)";
				const expectedValues = {
					a: files[0]!,
					b: files[1]!,
				};

				expectObservable(source$.pipe(validateRequiredFiles(["document", "avatar"]))).toBe(
					expected,
					expectedValues,
				);
			});
		});

		it("should error when required field names are missing", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const files: MultipartFileStream[] = [createMockFileStream("document", "doc.pdf")];

				const source$ = cold("(a|)", {
					a: files[0]!,
				});

				const expected = "(a#)";
				const expectedValues = {
					a: files[0]!,
				};

				expectObservable(source$.pipe(validateRequiredFiles(["document", "avatar"]))).toBe(
					expected,
					expectedValues,
					new MissingFilesError(["avatar"]),
				);
			});
		});

		it("should pass when no required field names specified", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const files: MultipartFileStream[] = [createMockFileStream("document", "doc.pdf")];

				const source$ = cold("(a|)", {
					a: files[0]!,
				});

				const expected = "(a|)";
				const expectedValues = {
					a: files[0]!,
				};

				expectObservable(source$.pipe(validateRequiredFiles([]))).toBe(expected, expectedValues);
			});
		});

		it("should handle multiple missing required files", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const files: MultipartFileStream[] = [createMockFileStream("document", "doc.pdf")];

				const source$ = cold("(a|)", {
					a: files[0]!,
				});

				const expected = "(a#)";
				const expectedValues = {
					a: files[0]!,
				};

				expectObservable(
					source$.pipe(validateRequiredFiles(["document", "avatar", "thumbnail"])),
				).toBe(expected, expectedValues, new MissingFilesError(["avatar", "thumbnail"]));
			});
		});

		it("should handle duplicate field names correctly", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const files: MultipartFileStream[] = [
					createMockFileStream("document", "doc1.pdf"),
					createMockFileStream("document", "doc2.pdf"), // Same field name
				];

				const source$ = cold("(ab|)", {
					a: files[0]!,
					b: files[1]!,
				});

				const expected = "(ab|)";
				const expectedValues = {
					a: files[0]!,
					b: files[1]!,
				};

				// Both files should pass through, requirement satisfied by first occurrence
				expectObservable(source$.pipe(validateRequiredFiles(["document"]))).toBe(
					expected,
					expectedValues,
				);
			});
		});
	});

	describe("bufferFiles", () => {
		it("should convert file streams to buffered files", (done) => {
			const fileContent = "test file content";
			const file = createMockFileStream("document", "test.txt", fileContent);

			const source$ = of(file);
			const result$ = source$.pipe(bufferFiles());

			result$.subscribe({
				next: (bufferedFile) => {
					try {
						expect(bufferedFile.fieldname).toBe("document");
						expect(bufferedFile.filename).toBe("test.txt");
						expect(bufferedFile.mimetype).toBe("text/plain");
						expect(bufferedFile.encoding).toBe("7bit");
						expect(bufferedFile.length).toBe(Buffer.byteLength(fileContent));
						expect(bufferedFile.toString()).toBe(fileContent);
						expect(Buffer.isBuffer(bufferedFile)).toBe(true);
					} catch (error) {
						done(error);
						return;
					}
				},
				complete: () => done(),
				error: done,
			});
		});

		it("should handle multiple files", (done) => {
			const file1 = createMockFileStream("doc1", "file1.txt", "content1");
			const file2 = createMockFileStream("doc2", "file2.txt", "content2");

			const source$ = of(file1, file2);
			const result$ = source$.pipe(bufferFiles());

			const receivedFiles: MultipartFileBuffer[] = [];

			result$.subscribe({
				next: (bufferedFile) => receivedFiles.push(bufferedFile),
				complete: () => {
					try {
						expect(receivedFiles).toHaveLength(2);

						expect(receivedFiles[0]!.fieldname).toBe("doc1");
						expect(receivedFiles[0]!.toString()).toBe("content1");

						expect(receivedFiles[1]!.fieldname).toBe("doc2");
						expect(receivedFiles[1]!.toString()).toBe("content2");

						done();
					} catch (error) {
						done(error);
					}
				},
				error: done,
			});
		});

		it("should handle empty files", (done) => {
			const emptyFile = createMockFileStream("empty", "empty.txt", "");

			const source$ = of(emptyFile);
			const result$ = source$.pipe(bufferFiles());

			result$.subscribe({
				next: (bufferedFile) => {
					try {
						expect(bufferedFile.fieldname).toBe("empty");
						expect(bufferedFile.length).toBe(0);
						expect(bufferedFile.toString()).toBe("");
					} catch (error) {
						done(error);
						return;
					}
				},
				complete: () => done(),
				error: done,
			});
		});
	});
});
