import { Readable } from "node:stream";

import { wrapReadableIntoMultipartFileStream } from "./multipart.utils";

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
