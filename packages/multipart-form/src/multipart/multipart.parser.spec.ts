import { PassThrough } from "node:stream";

describe.skip("parseMultipartData", () => {
	let _mockReq: PassThrough;
	let _mockHeaders: Record<string, string>;

	beforeEach(() => {
		_mockReq = new PassThrough();
		_mockHeaders = {
			"content-type": "multipart/form-data; boundary=WebKitFormBoundary7MA4YWxkTrZu0gW",
		};
	});

	it.todo("should be");
});
