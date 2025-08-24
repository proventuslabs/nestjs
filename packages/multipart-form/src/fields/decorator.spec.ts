import type { ExecutionContext } from "@nestjs/common";

import { createMock } from "@golevelup/ts-jest";
import { type Observable, of } from "rxjs";
import { TestScheduler } from "rxjs/testing";

import { MissingFieldsError } from "../core/errors";
import type { MultipartField } from "../core/types";
import { multipartFieldsFactory } from "./decorator";

describe("multipartFieldsFactory", () => {
	let scheduler: TestScheduler;

	beforeEach(() => {
		scheduler = new TestScheduler((actual, expected) => {
			expect(actual).toEqual(expected);
		});
	});

	const makeField = (name: string, value = "value"): MultipartField => ({
		name,
		value,
		mimetype: "text/plain",
		encoding: "7bit",
	});

	const createContext = (fields$: Observable<MultipartField>, type: "http" | "ws" = "http") =>
		createMock<ExecutionContext>({
			getType: () => type,
			switchToHttp: () => ({
				getRequest: () => ({
					_fields$: fields$,
				}),
			}),
		});

	it("should return EMPTY if context type is not http", () => {
		scheduler.run(({ expectObservable }) => {
			const ctx = createContext(of(makeField("field")), "ws");
			const result$ = multipartFieldsFactory(undefined, ctx);
			expectObservable(result$).toBe("|");
		});
	});

	it("should return EMPTY if request has no _fields$", () => {
		scheduler.run(({ expectObservable }) => {
			const ctx = createMock<ExecutionContext>({
				getType: () => "http",
				switchToHttp: () => ({
					getRequest: () => ({}),
				}),
			});
			const result$ = multipartFieldsFactory(undefined, ctx);
			expectObservable(result$).toBe("|");
		});
	});

	it("should pass through all fields when options is undefined", () => {
		scheduler.run(({ cold, expectObservable }) => {
			const f1 = makeField("foo");
			const f2 = makeField("bar");
			const fields$ = cold("a-b-|", { a: f1, b: f2 });
			const ctx = createContext(fields$);
			const result$ = multipartFieldsFactory(undefined, ctx);
			expectObservable(result$).toBe("a-b-|", { a: f1, b: f2 });
		});
	});

	it("should filter and emit only required fields", () => {
		scheduler.run(({ cold, expectObservable }) => {
			const foo = makeField("foo");
			const bar = makeField("bar");
			const fields$ = cold("a-b-|", { a: foo, b: bar });
			const ctx = createContext(fields$);
			const result$ = multipartFieldsFactory("foo", ctx);
			expectObservable(result$).toBe("a---|", { a: foo });
		});
	});

	it("should error if required field is missing", () => {
		scheduler.run(({ cold, expectObservable }) => {
			const bar = makeField("bar");
			const fields$ = cold("a-|", { a: bar });
			const ctx = createContext(fields$);
			const result$ = multipartFieldsFactory("foo", ctx);
			expectObservable(result$).toBe("--#", undefined, new MissingFieldsError(["foo"]));
		});
	});

	it("should accept optional fields without error", () => {
		scheduler.run(({ cold, expectObservable }) => {
			const bar = makeField("bar");
			const fields$ = cold("a-|", { a: bar });
			const ctx = createContext(fields$);
			const result$ = multipartFieldsFactory([["bar", false]], ctx);
			expectObservable(result$).toBe("a-|", { a: bar });
		});
	});

	describe("starts with pattern (^ prefix)", () => {
		it("should match fields that start with the pattern", () => {
			scheduler.run(({ cold, expectObservable }) => {
				const userEmail = makeField("user_email");
				const userName = makeField("user_name");
				const otherField = makeField("other_field");
				const fields$ = cold("a-b-c-|", { a: userEmail, b: userName, c: otherField });
				const ctx = createContext(fields$);
				const result$ = multipartFieldsFactory("^user_", ctx);
				expectObservable(result$).toBe("a-b---|", { a: userEmail, b: userName });
			});
		});

		it("should work with array syntax for starts with patterns", () => {
			scheduler.run(({ cold, expectObservable }) => {
				const userEmail = makeField("user_email");
				const adminRole = makeField("admin_role");
				const otherField = makeField("other_field");
				const fields$ = cold("a-b-c-|", { a: userEmail, b: adminRole, c: otherField });
				const ctx = createContext(fields$);
				const result$ = multipartFieldsFactory(["^user_", "^admin_"], ctx);
				expectObservable(result$).toBe("a-b---|", { a: userEmail, b: adminRole });
			});
		});

		it("should support optional starts with patterns", () => {
			scheduler.run(({ cold, expectObservable }) => {
				const userEmail = makeField("user_email");
				const otherField = makeField("other_field");
				const fields$ = cold("a-b-|", { a: userEmail, b: otherField });
				const ctx = createContext(fields$);
				const result$ = multipartFieldsFactory(
					[
						["^user_", false],
						["^admin_", false],
					],
					ctx,
				);
				expectObservable(result$).toBe("a---|", { a: userEmail });
			});
		});

		it("should error if required starts with pattern has no matches", () => {
			scheduler.run(({ cold, expectObservable }) => {
				const otherField = makeField("other_field");
				const fields$ = cold("a-|", { a: otherField });
				const ctx = createContext(fields$);
				const result$ = multipartFieldsFactory("^user_", ctx);
				expectObservable(result$).toBe("--#", undefined, new MissingFieldsError(["^user_"]));
			});
		});

		it("should mix exact matches and starts with patterns", () => {
			scheduler.run(({ cold, expectObservable }) => {
				const exactField = makeField("exact");
				const userEmail = makeField("user_email");
				const userName = makeField("user_name");
				const otherField = makeField("other_field");
				const fields$ = cold("a-b-c-d-|", {
					a: exactField,
					b: userEmail,
					c: userName,
					d: otherField,
				});
				const ctx = createContext(fields$);
				const result$ = multipartFieldsFactory(["exact", "^user_"], ctx);
				expectObservable(result$).toBe("a-b-c---|", { a: exactField, b: userEmail, c: userName });
			});
		});

		it("should handle empty pattern after ^ prefix", () => {
			scheduler.run(({ cold, expectObservable }) => {
				const emptyName = makeField("");
				const someField = makeField("some_field");
				const fields$ = cold("a-b-|", { a: emptyName, b: someField });
				const ctx = createContext(fields$);
				const result$ = multipartFieldsFactory("^", ctx);
				expectObservable(result$).toBe("a-b-|", { a: emptyName, b: someField });
			});
		});
	});
});
