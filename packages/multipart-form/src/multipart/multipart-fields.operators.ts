import { map, type Observable } from "rxjs";

import type { MultipartField } from "./multipart.types";

/**
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
				// Nested [ inside bracket → invalid
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
