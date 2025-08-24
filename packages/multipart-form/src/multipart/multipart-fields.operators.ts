import qs from "qs";
import { map, type Observable, toArray } from "rxjs";

import type { MultipartField } from "./multipart.types";

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
