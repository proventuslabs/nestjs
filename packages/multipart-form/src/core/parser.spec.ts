import { PassThrough, Readable } from "node:stream";

import { finalize, Subject } from "rxjs";
import { TestScheduler } from "rxjs/testing";

import {
	FieldsLimitError,
	FilesLimitError,
	MultipartError,
	PartsLimitError,
	TruncatedFieldError,
	TruncatedFileError,
} from "./errors";
import { parseMultipartData } from "./parser";
import type { MultipartOptions } from "./types";

describe("parseMultipartData", () => {
	let _testScheduler: TestScheduler;
	let mockReq: PassThrough;
	let mockHeaders: Record<string, string>;
	let upstreamExecutionDone$: Subject<never>;

	beforeEach(() => {
		_testScheduler = new TestScheduler((actual, expected) => {
			expect(actual).toEqual(expected);
		});

		mockReq = new PassThrough();
		mockHeaders = {
			"content-type": "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
		};
		upstreamExecutionDone$ = new Subject<never>();
	});

	afterEach(() => {
		upstreamExecutionDone$.complete();
	});

	it("should parse multipart data and emit files and fields observables", (done) => {
		const multipartData = [
			"------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n",
			'Content-Disposition: form-data; name="field1"\r\n',
			"\r\n",
			"value1\r\n",
			"------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n",
			'Content-Disposition: form-data; name="file1"; filename="test.txt"\r\n',
			"Content-Type: text/plain\r\n",
			"\r\n",
			"file content\r\n",
			"------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n",
		].join("");

		const parser$ = parseMultipartData(mockReq, mockHeaders, upstreamExecutionDone$);

		parser$.subscribe({
			next: ({ files, fields }) => {
				expect(files).toBeDefined();
				expect(fields).toBeDefined();

				let fieldCount = 0;
				let fileCount = 0;

				fields.subscribe({
					next: (field) => {
						expect(field.name).toBe("field1");
						expect(field.value).toBe("value1");
						fieldCount++;
					},
					complete: () => {
						expect(fieldCount).toBe(1);
					},
				});

				files.subscribe({
					next: (file) => {
						expect(file.fieldname).toBe("file1");
						expect(file.filename).toBe("test.txt");
						expect(file.mimetype).toBe("text/plain");
						fileCount++;

						let content = "";
						file.on("data", (chunk) => {
							content += chunk.toString();
						});
						file.on("end", () => {
							expect(content).toBe("file content");
							expect(fileCount).toBe(1);
							done();
						});
					},
				});
			},
		});

		// Write multipart data to mock request.
		mockReq.write(multipartData);
		mockReq.end();
	});

	it("should handle empty multipart data", (done) => {
		const multipartData = "------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n";

		const parser$ = parseMultipartData(mockReq, mockHeaders, upstreamExecutionDone$);

		parser$.subscribe({
			next: ({ files, fields }) => {
				let fieldCount = 0;
				let fileCount = 0;

				fields.subscribe({
					next: () => fieldCount++,
					complete: () => {
						expect(fieldCount).toBe(0);
					},
				});

				files.subscribe({
					next: () => fileCount++,
					complete: () => {
						expect(fileCount).toBe(0);
						done();
					},
				});
			},
		});

		mockReq.write(multipartData);
		mockReq.end();
	});

	it("should emit MultipartError when busboy initialization fails", (done) => {
		const invalidHeaders = {};

		const parser$ = parseMultipartData(mockReq, invalidHeaders, upstreamExecutionDone$);

		parser$.subscribe({
			error: (err) => {
				expect(err).toBeInstanceOf(MultipartError);
				expect(err.message).toBe("Failed to initialize Busboy");
				done();
			},
		});
	});

	it("should emit PartsLimitError when parts limit is exceeded", (done) => {
		const options: MultipartOptions = {
			limits: { parts: 1 },
		};

		const multipartData = [
			"------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n",
			'Content-Disposition: form-data; name="field1"\r\n',
			"\r\n",
			"value1\r\n",
			"------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n",
			'Content-Disposition: form-data; name="field2"\r\n',
			"\r\n",
			"value2\r\n",
			"------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n",
		].join("");

		const parser$ = parseMultipartData(mockReq, mockHeaders, upstreamExecutionDone$, options);

		parser$.subscribe({
			error: (err) => {
				expect(err).toBeInstanceOf(PartsLimitError);
				done();
			},
		});

		mockReq.write(multipartData);
		mockReq.end();
	});

	it("should emit FilesLimitError when files limit is exceeded", (done) => {
		const options: MultipartOptions = {
			limits: { files: 1 },
		};

		const multipartData = [
			"------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n",
			'Content-Disposition: form-data; name="file1"; filename="test1.txt"\r\n',
			"Content-Type: text/plain\r\n",
			"\r\n",
			"content1\r\n",
			"------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n",
			'Content-Disposition: form-data; name="file2"; filename="test2.txt"\r\n',
			"Content-Type: text/plain\r\n",
			"\r\n",
			"content2\r\n",
			"------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n",
		].join("");

		const parser$ = parseMultipartData(mockReq, mockHeaders, upstreamExecutionDone$, options);

		parser$.subscribe({
			error: (err) => {
				expect(err).toBeInstanceOf(FilesLimitError);
				done();
			},
		});

		mockReq.write(multipartData);
		mockReq.end();
	});

	it("should emit FieldsLimitError when fields limit is exceeded", (done) => {
		const options: MultipartOptions = {
			limits: { fields: 1 },
		};

		const multipartData = [
			"------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n",
			'Content-Disposition: form-data; name="field1"\r\n',
			"\r\n",
			"value1\r\n",
			"------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n",
			'Content-Disposition: form-data; name="field2"\r\n',
			"\r\n",
			"value2\r\n",
			"------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n",
		].join("");

		const parser$ = parseMultipartData(mockReq, mockHeaders, upstreamExecutionDone$, options);

		parser$.subscribe({
			error: (err) => {
				expect(err).toBeInstanceOf(FieldsLimitError);
				done();
			},
		});

		mockReq.write(multipartData);
		mockReq.end();
	});

	it("should emit TruncatedFileError when file is truncated", (done) => {
		const options: MultipartOptions = {
			limits: { fileSize: 5 },
		};

		const multipartData = [
			"------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n",
			'Content-Disposition: form-data; name="file1"; filename="test.txt"\r\n',
			"Content-Type: text/plain\r\n",
			"\r\n",
			"this is a long file content that exceeds the limit\r\n",
			"------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n",
		].join("");

		const parser$ = parseMultipartData(mockReq, mockHeaders, upstreamExecutionDone$, options);

		parser$.pipe(finalize(done)).subscribe({
			next: ({ files }) => {
				files.subscribe({
					next: (file) => {
						file.on("data", () => {}); // Attach data to drain stream.
						file.on("error", (err) => {
							// File stream errors out to make sure any other node stream errors out.
							expect(err).toBeInstanceOf(TruncatedFileError);
						});
						file.on("end", () => {
							// File truncation is detected on 'end' event.
						});
					},
					error: (err) => {
						// Files stream errors out.
						expect(err).toBeInstanceOf(TruncatedFileError);
					},
				});
			},
			error: (err) => {
				// Parser streams errors out.
				expect(err).toBeInstanceOf(TruncatedFileError);
			},
		});

		mockReq.write(multipartData);
		mockReq.end();

		expect.assertions(3);
	});

	it("should emit TruncatedFieldError when field is truncated", (done) => {
		const options: MultipartOptions = {
			limits: { fieldSize: 5 },
		};

		const multipartData = [
			"------WebKitFormBoundary7MA4YWxkTrZu0gW\r\n",
			'Content-Disposition: form-data; name="field1"\r\n',
			"\r\n",
			"this is a very long field value that exceeds the limit\r\n",
			"------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n",
		].join("");

		const parser$ = parseMultipartData(mockReq, mockHeaders, upstreamExecutionDone$, options);

		parser$.subscribe({
			error: (err) => {
				expect(err).toBeInstanceOf(TruncatedFieldError);
				done();
			},
		});

		mockReq.write(multipartData);
		mockReq.end();
	});

	it("should handle busboy processing errors", (done) => {
		const mockReq = new Readable({
			read() {
				this.emit("error", new Error("Stream error"));
			},
		});

		const parser$ = parseMultipartData(mockReq, mockHeaders, upstreamExecutionDone$);

		parser$.subscribe({
			error: (err) => {
				expect(err).toBeInstanceOf(MultipartError);
				done();
			},
		});
	});

	it("should pause and resume request stream correctly", () => {
		const pauseSpy = jest.spyOn(mockReq, "pause");
		const resumeSpy = jest.spyOn(mockReq, "resume");

		parseMultipartData(mockReq, mockHeaders, upstreamExecutionDone$).subscribe();

		expect(pauseSpy).toHaveBeenCalledTimes(1);
		expect(resumeSpy).toHaveBeenCalledTimes(2); // Stream start, stream drain.
	});

	it("should handle unsubscription correctly", () => {
		const unpipeSpy = jest.spyOn(mockReq, "unpipe");

		const subscription = parseMultipartData(
			mockReq,
			mockHeaders,
			upstreamExecutionDone$,
		).subscribe();
		subscription.unsubscribe();

		expect(unpipeSpy).toHaveBeenCalled();
	});
});
