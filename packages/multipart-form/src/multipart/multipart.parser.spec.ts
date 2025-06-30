import { PassThrough, Readable } from "node:stream";

import type busboy from "busboy";

import { handleField, handleFile, parseMultipartData } from "./multipart.parser";
import type { MultipartFields, MultipartFileUpload } from "./multipart.types";

describe("handleFile", () => {
	let files: MultipartFileUpload[];
	let mockFile: Readable;
	let mockInfo: busboy.FileInfo;

	beforeEach(() => {
		files = [];
		mockFile = Readable.from("test");
		mockInfo = {
			filename: "test.txt",
			encoding: "7bit",
			mimeType: "text/plain",
		};
	});

	it("should add file to files array when not truncated", () => {
		handleFile("testField", mockFile, false, mockInfo, files);

		expect(files).toHaveLength(1);
		expect(files[0]).toHaveProperty("fieldname", "testField");
		expect(files[0]).toHaveProperty("filename", "test.txt");
		expect(files[0]).toHaveProperty("encoding", "7bit");
		expect(files[0]).toHaveProperty("mimetype", "text/plain");
	});

	it("should consume the file stream when truncated", (done) => {
		mockFile.once("end", () => {
			expect(mockFile.readable).toBe(false);
			done();
		});

		handleFile("testField", mockFile, true, mockInfo, files);

		expect(files).toHaveLength(0);
	});

	it("should create a tee stream for the file", () => {
		handleFile("testField", mockFile, false, mockInfo, files);

		expect(files[0]).not.toBe(mockFile);
	});
});

describe("handleField", () => {
	let fields: MultipartFields;
	let mockInfo: busboy.FieldInfo;

	beforeEach(() => {
		fields = {};
		mockInfo = {
			nameTruncated: false,
			valueTruncated: false,
			encoding: "7bit",
			mimeType: "text/plain",
		};
	});

	it("should set simple field value", () => {
		handleField("name", "John Doe", mockInfo, fields);

		expect(fields.name).toBe("John Doe");
	});

	it("should handle array field with index", () => {
		handleField("items[0]", "item1", mockInfo, fields);
		handleField("items[1]", "item2", mockInfo, fields);

		expect(fields.items).toEqual(["item1", "item2"]);
	});

	it("should handle array field without index", () => {
		handleField("items[]", "item1", mockInfo, fields);
		handleField("items[]", "item2", mockInfo, fields);

		expect(fields.items).toEqual(["item1", "item2"]);
	});

	it("should append non-array value to existing array", () => {
		fields.name = ["existing"];
		handleField("name", "new", mockInfo, fields);

		expect(fields.name).toEqual(["existing", "new"]);
	});

	it("should overwrite existing non-array with single value", () => {
		fields.name = "existing";
		handleField("name[]", "new", mockInfo, fields);

		expect(fields.name).toEqual("new");
	});

	it("should not add field when name is truncated", () => {
		mockInfo.nameTruncated = true;
		handleField("name", "value", mockInfo, fields);

		expect(fields).toEqual({});
	});

	it("should not add field when value is truncated", () => {
		mockInfo.valueTruncated = true;
		handleField("name", "value", mockInfo, fields);

		expect(fields).toEqual({});
	});

	it("should handle complex field names", () => {
		handleField("user.profile.name", "John", mockInfo, fields);

		expect(fields["user.profile.name"]).toBe("John");
	});
});

describe("parseMultipartData", () => {
	let mockReq: PassThrough;
	let mockHeaders: Record<string, string>;

	beforeEach(() => {
		mockReq = new PassThrough();
		mockHeaders = {
			"content-type": "multipart/form-data; boundary=WebKitFormBoundary7MA4YWxkTrZu0gW",
		};
	});

	it("should parse multipart data successfully", async () => {
		const promise = parseMultipartData(mockReq, mockHeaders);

		mockReq.write(
			"--WebKitFormBoundary7MA4YWxkTrZu0gW\r\n" +
				'Content-Disposition: form-data; name="field1"\r\n\r\n' +
				"value1\r\n" +
				"--WebKitFormBoundary7MA4YWxkTrZu0gW\r\n" +
				'Content-Disposition: form-data; name="field2[]"\r\n\r\n' +
				"value2\r\n" +
				"--WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n",
		);
		mockReq.end();

		const [files, fields] = await promise;

		expect(files).toEqual([]);
		expect(fields).toEqual({
			field1: "value1",
			field2: ["value2"],
		});
	});

	it("should handle file uploads", async () => {
		const promise = parseMultipartData(mockReq, mockHeaders);

		mockReq.write(
			"--WebKitFormBoundary7MA4YWxkTrZu0gW\r\n" +
				'Content-Disposition: form-data; name="file"; filename="test.txt"\r\n' +
				"Content-Type: text/plain\r\n\r\n" +
				"file content\r\n" +
				"--WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n",
		);
		mockReq.end();

		const [files, fields] = await promise;

		expect(files).toHaveLength(1);
		expect(files[0]?.fieldname).toBe("file");
		expect(files[0]?.filename).toBe("test.txt");
		expect(files[0]?.mimetype).toBe("text/plain");
		expect(fields).toEqual({});
	});

	it("should handle mixed content (files and fields)", async () => {
		const promise = parseMultipartData(mockReq, mockHeaders);

		mockReq.write(
			"--WebKitFormBoundary7MA4YWxkTrZu0gW\r\n" +
				'Content-Disposition: form-data; name="name"\r\n\r\n' +
				"John Doe\r\n" +
				"--WebKitFormBoundary7MA4YWxkTrZu0gW\r\n" +
				'Content-Disposition: form-data; name="file"; filename="test.txt"\r\n' +
				"Content-Type: text/plain\r\n\r\n" +
				"file content\r\n" +
				"--WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n",
		);
		mockReq.end();

		const [files, fields] = await promise;

		expect(files).toHaveLength(1);
		expect(fields.name).toBe("John Doe");
	});

	it("should handle array fields", async () => {
		const promise = parseMultipartData(mockReq, mockHeaders);

		mockReq.write(
			"--WebKitFormBoundary7MA4YWxkTrZu0gW\r\n" +
				'Content-Disposition: form-data; name="items[]"\r\n\r\n' +
				"item1\r\n" +
				"--WebKitFormBoundary7MA4YWxkTrZu0gW\r\n" +
				'Content-Disposition: form-data; name="items[]"\r\n\r\n' +
				"item2\r\n" +
				"--WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n",
		);
		mockReq.end();

		const [files, fields] = await promise;

		expect(files).toEqual([]);
		expect(fields.items).toEqual(["item1", "item2"]);
	});

	it("should handle indexed array fields", async () => {
		const promise = parseMultipartData(mockReq, mockHeaders);

		mockReq.write(
			"--WebKitFormBoundary7MA4YWxkTrZu0gW\r\n" +
				'Content-Disposition: form-data; name="items[0]"\r\n\r\n' +
				"item1\r\n" +
				"--WebKitFormBoundary7MA4YWxkTrZu0gW\r\n" +
				'Content-Disposition: form-data; name="items[1]"\r\n\r\n' +
				"item2\r\n" +
				"--WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n",
		);
		mockReq.end();

		const [files, fields] = await promise;

		expect(files).toEqual([]);
		expect(fields.items).toEqual(["item1", "item2"]);
	});

	it("should reject on busboy error", async () => {
		await expect(parseMultipartData(mockReq, {})).rejects.toThrow("Missing Content-Type");
	});

	it("should handle empty multipart data", async () => {
		const promise = parseMultipartData(mockReq, mockHeaders);

		// Just the boundary
		mockReq.write("--WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n");
		mockReq.end();

		const [files, fields] = await promise;

		expect(files).toEqual([]);
		expect(fields).toEqual({});
	});

	it("should handle custom busboy config", async () => {
		const config = { limits: { fieldSize: 1024 } };
		const promise = parseMultipartData(mockReq, mockHeaders, config);

		mockReq.write(
			"--WebKitFormBoundary7MA4YWxkTrZu0gW\r\n" +
				'Content-Disposition: form-data; name="field1"\r\n\r\n' +
				"value1\r\n" +
				"--WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n",
		);
		mockReq.end();

		const [files, fields] = await promise;

		expect(files).toEqual([]);
		expect(fields.field1).toBe("value1");
	});
});
