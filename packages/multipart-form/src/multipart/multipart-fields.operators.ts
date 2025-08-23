import { map, type Observable } from "rxjs";

import type { MultipartField } from "./multipart.types";

/**
 * Parses a field name to determine if it uses association-like syntax.
 * Supports both `field[base]` and  nested ones `field[abc][0]` syntax patterns.
 *
 * @param fieldname The field name to parse
 * @returns Parsed field name information or undefined if none
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
 * RxJS operator that maps associatives multipart fields.
 *
 * @example
 * fields$.pipe(
 *   associateFields()
 * ).subscribe(field => {
 *   // syntax: name[first]=John
 *   // field.name: "name[first]"
 *   // field.value: "John"
 *   // field.isAssociative: true
 *   // field.basename: "name"
 *   // field.associations: ["first"]
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
