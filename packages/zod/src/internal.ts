import { camelCase, flatMap, get, isEmpty, isString, pickBy, reduce, set, snakeCase } from "lodash";
import { type $ZodError, type $ZodType, toDotPath, toJSONSchema } from "zod/v4/core";

/**
 * Transforms environment variable keys into nested object notation starting from the provided namespace.
 * For example, transforms "APP_SERVER__HOST" into "app.server.host" using camelCase ("APP" was the env namespace).
 *
 * @param envKey - The environment variable key to transform
 * @param envNamespace - The namespace prefix to replace with a dot notation
 * @returns A string in dot notation following camelCase conventions
 */
function nestedConventionNamespaced(envKey: string, envNamespace: string): string {
	return envKey
		.replace(`${envNamespace}_`, `${envNamespace}.`)
		.toLowerCase()
		.replace(/__/g, ".")
		.replace(/[a-z_]+/g, (word) => camelCase(word));
}

/**
 * Transforms environment variables from a flat structure with a specific namespace prefix
 * into a nested object structure with camelCase keys, while preserving the original keys
 * for error reporting.
 *
 * For example, transforms:
 * {
 *   "MY_APP_SERVER__HOST": "localhost",
 *   "MY_APP_DATABASE__PORT": "5432",
 *   "UNRELATED_VAR": "value"
 * }
 *
 * With namespace "myApp" into:
 * {
 *   "myApp": {
 *     "server": {
 *       "host": "localhost"
 *     },
 *     "database": {
 *       "port": 5432  // Note: jsonify attempts to parse values
 *     }
 *   }
 * }
 *
 * @param variables - Record of environment variables with string keys and string values
 * @param namespace - The namespace prefix to filter variables (will be converted to SNAKE_CASE)
 * @returns A tuple containing:
 *   1. The transformed nested configuration object
 *   2. A Map relating the transformed path keys to original environment variable names for error reporting
 */
export function decodeVariables(
	variables: Record<string, string | undefined>,
	namespace: string,
	whitelistKeys: Set<string | number | symbol> = new Set(),
): readonly [Record<string, string | undefined>, Map<string, string>] {
	const envKeys = new Map<string, string>();
	const envNamespace = snakeCase(namespace).toUpperCase();
	const relevantEnv = pickBy(
		variables,
		(_value, key) => key.startsWith(envNamespace) || whitelistKeys.has(key),
	);
	const decodedEnv = reduce(
		relevantEnv,
		(env, value, key) => {
			if (whitelistKeys.has(key)) key = `${envNamespace}_${key}`;

			const newKey = nestedConventionNamespaced(key, envNamespace);
			envKeys.set(newKey, key);
			return set(env, newKey, value);
		},
		{} as Record<string, string | undefined>,
	);

	return [decodedEnv, envKeys];
}

/**
 * Converts a Zod validation error into a formatted TypeError with enhanced context.
 *
 * This function takes a Zod schema and a ZodError, then formats each validation issue
 * by including its path, any matching JSON Schema description, and optionally
 * mapping environment variable keys. The resulting error is a `TypeError` with
 * the original ZodError set as its `cause`.
 *
 * @param schema - The Zod schema that was used to validate the data.
 * @param error - The Zod validation error to format.
 * @param context - The context in which the error occurred, used in the error message prefix.
 * @param namespace - A namespace or identifier to include in the error message.
 * @param envKeys - Optional mapping from dot-notation paths to environment variable names.
 *
 * @returns {TypeError} A TypeError containing a formatted error message for all
 *   validation issues, with the original ZodError as its `cause`.
 *
 * @example
 * const schema = z.object({ foo: z.string() });
 * const result = schema.safeParse({ foo: 123 });
 * if (!result.success) {
 *   throw typifyError(schema, result.error, "config", "MyApp");
 * }
 */
export const typifyError = <S extends $ZodType>(
	schema: S,
	error: $ZodError,
	namespace: string,
	envKeys: Map<string, string> = new Map(),
	jsonSchemaOptions: Parameters<typeof toJSONSchema>[1] = { unrepresentable: "any" },
): string => {
	// NOTE: shamelessy copied from `prettifyError`
	const lines: string[] = [];
	const jsonSchema = toJSONSchema(schema, jsonSchemaOptions);

	// sort by path length
	const issues = [...error.issues].sort((a, b) => (a.path ?? []).length - (b.path ?? []).length);

	// process each issue
	for (const issue of issues) {
		lines.push(`✖ ${issue.message}`);
		if (issue.path?.length) {
			// walk through the json schema for the "description" property
			const jsonSchemafullPath = flatMap(issue.path, (p) => ["properties", p]);
			jsonSchemafullPath.push("description");
			const descriptionValue = get(jsonSchema, toDotPath(jsonSchemafullPath));
			const description = isString(descriptionValue) ? `: ${descriptionValue}` : "";

			// use the env key or the path (prefixed with the namespace to have in the error formatting the namespace name too)
			// (e.g. instead of -> at port: ... you get -> at app.port: ... so you don't have to see the header for the namespace name)
			const issuePath = isEmpty(namespace) ? issue.path : [namespace.toLowerCase(), ...issue.path];
			const path = toDotPath(issuePath);
			const via = envKeys.get(path) ? ` via ${envKeys.get(path)}` : "";

			lines.push(`  → at ${path}${via}${description}`);
		}
	}

	return lines.join("\n");
};
