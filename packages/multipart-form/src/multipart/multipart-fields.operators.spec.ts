/** biome-ignore-all lint/style/noNonNullAssertion: we use arrays to create sources and we know inline that [0] is not undefined */
import { TestScheduler } from "rxjs/testing";

import type { MultipartField } from "./multipart.types";
import { associateFields, collectAssociatives } from "./multipart-fields.operators";

describe("multipart-fields.operators", () => {
	let testScheduler: TestScheduler;

	beforeEach(() => {
		testScheduler = new TestScheduler((actual, expected) => {
			expect(actual).toEqual(expected);
		});
	});

	describe("associateFields", () => {
		it("should pass through regular fields unchanged", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const fields: MultipartField[] = [
					{ name: "username", value: "john", mimetype: "", encoding: "7bit" },
					{ name: "email", value: "john@example.com", mimetype: "", encoding: "7bit" },
				];

				const source$ = cold("(ab|)", {
					a: fields[0]!,
					b: fields[1]!,
				});

				const expected = "(ab|)";
				const expectedValues = {
					a: fields[0]!,
					b: fields[1]!,
				};

				expectObservable(source$.pipe(associateFields())).toBe(expected, expectedValues);
			});
		});

		it("should parse simple associative fields", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const field: MultipartField = {
					name: "user[name]",
					value: "john",
					mimetype: "",
					encoding: "7bit",
				};

				const source$ = cold("(a|)", { a: field });

				const expected = "(a|)";
				const expectedValues = {
					a: {
						name: "user[name]",
						value: "john",
						mimetype: "",
						encoding: "7bit",
						isAssociative: true,
						basename: "user",
						associations: ["name"],
					} satisfies MultipartField,
				};

				expectObservable(source$.pipe(associateFields())).toBe(expected, expectedValues);
			});
		});

		it("should parse array-like associative fields", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const fields: MultipartField[] = [
					{ name: "hobbies[]", value: "reading", mimetype: "", encoding: "7bit" },
					{ name: "scores[0]", value: "95", mimetype: "", encoding: "7bit" },
				];

				const source$ = cold("(ab|)", {
					a: fields[0]!,
					b: fields[1]!,
				});

				const expected = "(ab|)";
				const expectedValues = {
					a: {
						name: "hobbies[]",
						value: "reading",
						mimetype: "",
						encoding: "7bit",
						isAssociative: true,
						basename: "hobbies",
						associations: [""],
					} satisfies MultipartField,
					b: {
						name: "scores[0]",
						value: "95",
						mimetype: "",
						encoding: "7bit",
						isAssociative: true,
						basename: "scores",
						associations: ["0"],
					} satisfies MultipartField,
				};

				expectObservable(source$.pipe(associateFields())).toBe(expected, expectedValues);
			});
		});

		it("should parse nested associative fields", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const field: MultipartField = {
					name: "address[street][number]",
					value: "123",
					mimetype: "",
					encoding: "7bit",
				};

				const source$ = cold("(a|)", { a: field });

				const expected = "(a|)";
				const expectedValues = {
					a: {
						name: "address[street][number]",
						value: "123",
						mimetype: "",
						encoding: "7bit",
						isAssociative: true,
						basename: "address",
						associations: ["street", "number"],
					} satisfies MultipartField,
				};

				expectObservable(source$.pipe(associateFields())).toBe(expected, expectedValues);
			});
		});

		it("should handle mixed regular and associative fields", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const fields: MultipartField[] = [
					{ name: "name", value: "John", mimetype: "", encoding: "7bit" },
					{ name: "user[email]", value: "john@example.com", mimetype: "", encoding: "7bit" },
					{ name: "age", value: "30", mimetype: "", encoding: "7bit" },
					{ name: "tags[]", value: "developer", mimetype: "", encoding: "7bit" },
				];

				const source$ = cold("(abcd|)", {
					a: fields[0]!,
					b: fields[1]!,
					c: fields[2]!,
					d: fields[3]!,
				});

				const expected = "(abcd|)";
				const expectedValues = {
					a: fields[0], // Regular field unchanged
					b: {
						name: "user[email]",
						value: "john@example.com",
						mimetype: "",
						encoding: "7bit",
						isAssociative: true,
						basename: "user",
						associations: ["email"],
					} satisfies MultipartField,
					c: fields[2], // Regular field unchanged
					d: {
						name: "tags[]",
						value: "developer",
						mimetype: "",
						encoding: "7bit",
						isAssociative: true,
						basename: "tags",
						associations: [""],
					} satisfies MultipartField,
				};

				expectObservable(source$.pipe(associateFields())).toBe(expected, expectedValues);
			});
		});

		it("should handle invalid bracket syntax gracefully", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const fields: MultipartField[] = [
					{ name: "invalid[", value: "value1", mimetype: "", encoding: "7bit" },
					{ name: "invalid]", value: "value2", mimetype: "", encoding: "7bit" },
					{ name: "invalid[[nested]]", value: "value3", mimetype: "", encoding: "7bit" },
				];

				const source$ = cold("(abc|)", {
					a: fields[0]!,
					b: fields[1]!,
					c: fields[2]!,
				});

				const expected = "(abc|)";
				const expectedValues = {
					a: fields[0], // Invalid syntax, passed through unchanged
					b: fields[1], // Invalid syntax, passed through unchanged
					c: fields[2], // Invalid syntax, passed through unchanged
				};

				expectObservable(source$.pipe(associateFields())).toBe(expected, expectedValues);
			});
		});

		it("should handle empty field names", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const field: MultipartField = {
					name: "",
					value: "value",
					mimetype: "",
					encoding: "7bit",
				};

				const source$ = cold("(a|)", { a: field });

				const expected = "(a|)";
				const expectedValues = {
					a: field, // Empty name, passed through unchanged
				};

				expectObservable(source$.pipe(associateFields())).toBe(expected, expectedValues);
			});
		});

		it("should handle field name with only empty brackets", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const field: MultipartField = {
					name: "[]",
					value: "value",
					mimetype: "",
					encoding: "7bit",
				};

				const source$ = cold("(a|)", { a: field });

				const expected = "(a|)";
				const expectedValues = {
					a: {
						name: "[]",
						value: "value",
						mimetype: "",
						encoding: "7bit",
						associations: [""],
						basename: "",
						isAssociative: true,
					} satisfies MultipartField,
				};

				expectObservable(source$.pipe(associateFields())).toBe(expected, expectedValues);
			});
		});

		it("should handle complex nested structures", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const field: MultipartField = {
					name: "form[user][preferences][theme]",
					value: "dark",
					mimetype: "",
					encoding: "7bit",
				};

				const source$ = cold("(a|)", { a: field });

				const expected = "(a|)";
				const expectedValues = {
					a: {
						name: "form[user][preferences][theme]",
						value: "dark",
						mimetype: "",
						encoding: "7bit",
						isAssociative: true,
						basename: "form",
						associations: ["user", "preferences", "theme"],
					} satisfies MultipartField,
				};

				expectObservable(source$.pipe(associateFields())).toBe(expected, expectedValues);
			});
		});
	});

	describe("collectAssociatives", () => {
		it("should collect fields into objects using qs parsing", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const fields: MultipartField[] = [
					{ name: "user[name]", value: "john", mimetype: "", encoding: "7bit" },
					{ name: "user[email]", value: "john@example.com", mimetype: "", encoding: "7bit" },
					{ name: "tags[]", value: "javascript", mimetype: "", encoding: "7bit" },
					{ name: "tags[]", value: "typescript", mimetype: "", encoding: "7bit" },
				];

				const source$ = cold("(abcd|)", {
					a: fields[0]!,
					b: fields[1]!,
					c: fields[2]!,
					d: fields[3]!,
				});

				const expected = "(a|)";
				const expectedValues = {
					a: {
						user: {
							name: "john",
							email: "john@example.com",
						},
						tags: ["javascript", "typescript"],
					},
				};

				expectObservable(source$.pipe(collectAssociatives())).toBe(expected, expectedValues);
			});
		});

		it("should handle empty fields", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const source$ = cold<MultipartField>("|");

				const expected = "(a|)";
				const expectedValues = {
					a: {},
				};

				expectObservable(source$.pipe(collectAssociatives())).toBe(expected, expectedValues);
			});
		});

		it("should pass custom qs options", () => {
			testScheduler.run(({ cold, expectObservable }) => {
				const fields: MultipartField[] = [
					{ name: "items[0]", value: "first", mimetype: "", encoding: "7bit" },
					{ name: "items[1]", value: "second", mimetype: "", encoding: "7bit" },
				];

				const source$ = cold("(ab|)", {
					a: fields[0]!,
					b: fields[1]!,
				});

				const expected = "(a|)";
				const expectedValues = {
					a: {
						items: ["first", "second"],
					},
				};

				expectObservable(source$.pipe(collectAssociatives({ arrayLimit: 10 }))).toBe(
					expected,
					expectedValues,
				);
			});
		});
	});
});
