import qs from "qs";
import { filter, map, Observable, tap, toArray } from "rxjs";

import { MissingFieldsError } from "./multipart.errors";
import type { MultipartField } from "./multipart.types";

/**
 * @internal
 * Parses a field pattern to determine if it uses "starts with" syntax.
 *
 * @param pattern The field pattern to parse
 * @returns Object with the actual field name and whether it's a "starts with" pattern
 */
function parseFieldPattern(pattern: string): { fieldName: string; startsWithMatch: boolean } {
	if (pattern.startsWith("^")) {
		return {
			fieldName: pattern.slice(1),
			startsWithMatch: true,
		};
	}
	return {
		fieldName: pattern,
		startsWithMatch: false,
	};
}

/**
 * @internal
 * Checks if a field name matches a pattern.
 *
 * @param fieldName The actual field name from the multipart form
 * @param pattern The pattern to match against (may include ^ prefix)
 * @returns True if the field matches the pattern
 */
function matchesFieldPattern(fieldName: string, pattern: string): boolean {
	const { fieldName: patternName, startsWithMatch } = parseFieldPattern(pattern);

	if (startsWithMatch) {
		return fieldName.startsWith(patternName);
	}
	return fieldName === patternName;
}

/**
 * @internal
 * Parses a field name to determine if it uses associative syntax.
 * Supports both single-level `field[key]` and nested `field[key1][key2]` syntax patterns.
 *
 * @param fieldname The field name to parse
 * @returns Parsed field name information with basename and associations, or undefined if not associative
 */
function parseAssociations(
	fieldname: string,
): { basename: string; associations: string[] } | undefined {
	const len = fieldname.length;
	if (!len) return undefined;

	const associations: string[] = [];
	let basename = "";
	let buffer = "";
	let inBracket = false;

	for (let i = 0; i < len; i++) {
		const char = fieldname[i];

		if (char === "[") {
			if (!inBracket) {
				if (!basename) basename = buffer;
				buffer = "";
				inBracket = true;
			} else {
				// nested [ inside bracket → invalid
				return undefined;
			}
		} else if (char === "]") {
			if (!inBracket) return undefined; // unmatched ]
			associations.push(buffer);
			buffer = "";
			inBracket = false;
		} else {
			buffer += char;
		}
	}

	if (inBracket) return undefined; // unclosed bracket
	if (!basename) basename = buffer;
	if (associations.length === 0) return undefined;

	return {
		basename,
		associations,
	};
}

/**
 * RxJS operator that enriches multipart fields with associative syntax parsing.
 *
 * Transforms fields with associative syntax (e.g., "user[name]", "data[items][0]")
 * by adding parsed basename, associations array, and isAssociative flag.
 * Fields without associative syntax pass through unchanged.
 *
 * @returns RxJS operator function that transforms MultipartField observables
 *
 * @example
 * fields$.pipe(
 *   associateFields()
 * ).subscribe(field => {
 *   // For field name "user[name]" with value "John":
 *   console.log(field.name);          // "user[name]"
 *   console.log(field.value);         // "John"
 *   console.log(field.isAssociative); // true
 *   console.log(field.basename);      // "user"
 *   console.log(field.associations);  // ["name"]
 * });
 */
export function associateFields() {
	return (source: Observable<MultipartField>): Observable<MultipartField> => {
		return source.pipe(
			map((v) => {
				const parsed = parseAssociations(v.name);
				if (parsed) {
					const { basename, associations } = parsed;
					return {
						...v,
						associations,
						basename,
						isAssociative: true,
					};
				}

				return v;
			}),
		);
	};
}

/**
 * RxJS operator that collects associatives multipart fields into arrays.
 * Fields with array-like syntax (field[]) are collected into arrays while
 * fields with object-like syntax (field[name]) are collected into objects.
 * Uses `qs` under the hood.
 *
 * @example
 * fields$.pipe(
 *   associateFields(),
 *   collectAssociatives()
 * ).subscribe(fields => {
 *   // For fields "name[first]=John" and "name[last]=Doe":
 *   console.log(fields); // { "name": { "first": "John", "last": "Doe" } }
 * });
 */
export function collectAssociatives(
	options?: qs.IParseOptions<qs.BooleanOptional> & { decoder?: never | undefined },
) {
	return (source: Observable<MultipartField>): Observable<qs.ParsedQs> => {
		return source.pipe(
			map((v) => `${v.name}=${v.value}`),
			toArray(),
			map((q) => qs.parse(q.join("&"), options)),
		);
	};
}

/**
 * RxJS operator that converts multipart fields to a simple key-value record.
 *
 * @returns RxJS operator function that converts MultipartField observables to a record
 *
 * @example
 * fields$.pipe(
 *   collectToRecord()
 * ).subscribe(record => {
 *   console.log(record); // { name: "John", email: "john@example.com" }
 * });
 */
export function collectToRecord() {
	return (source: Observable<MultipartField>): Observable<Record<string, string>> => {
		return source.pipe(
			toArray(),
			map((fields) => {
				const record: Record<string, string> = {};
				for (const field of fields) {
					record[field.name] = field.value;
				}
				return record;
			}),
		);
	};
}

/**
 * RxJS operator that filters multipart fields by pattern matching.
 *
 * @param patterns Array of patterns to match against field names
 * @returns RxJS operator function that filters MultipartField observables
 *
 * @example
 * fields$.pipe(
 *   filterFieldsByPatterns(['name', '^user_'])
 * ).subscribe(field => console.log('Matched field:', field.name));
 */
export function filterFieldsByPatterns(patterns: string[]) {
	return (source: Observable<MultipartField>): Observable<MultipartField> => {
		return source.pipe(
			filter((field) => {
				// check if field matches any pattern
				return patterns.some((pattern) => matchesFieldPattern(field.name, pattern));
			}),
		);
	};
}

/**
 * RxJS operator that validates required field patterns are present when stream completes.
 *
 * @param requiredPatterns Array of required field patterns
 * @returns RxJS operator function that validates MultipartField observables
 *
 * @example
 * fields$.pipe(
 *   filterFieldsByPatterns(['name', '^user_', 'metadata']),
 *   validateRequiredFields(['name', '^user_'])
 * ).subscribe(field => console.log('Valid field:', field.name));
 */
export function validateRequiredFields(requiredPatterns: string[]) {
	return (source: Observable<MultipartField>): Observable<MultipartField> => {
		return new Observable<MultipartField>((subscriber) => {
			const matchedRequiredPatterns = new Set<string>();

			const subscription = source
				.pipe(
					tap((field) => {
						// track which required patterns have been matched
						for (const pattern of requiredPatterns) {
							if (matchesFieldPattern(field.name, pattern)) {
								matchedRequiredPatterns.add(pattern);
							}
						}
					}),
				)
				.subscribe({
					next: (field) => subscriber.next(field),
					error: (err) => subscriber.error(err),
					complete: () => {
						// check for missing REQUIRED patterns when upstream completes
						const missingRequired = requiredPatterns.filter(
							(pattern) => !matchedRequiredPatterns.has(pattern),
						);
						if (missingRequired.length > 0) {
							subscriber.error(new MissingFieldsError(missingRequired));
						} else {
							subscriber.complete();
						}
					},
				});

			return () => subscription.unsubscribe();
		});
	};
}
