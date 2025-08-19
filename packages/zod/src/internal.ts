import fs from "node:fs";

import {
	camelCase,
	flatMap,
	get,
	isObjectLike,
	isString,
	isUndefined,
	pickBy,
	reduce,
	set,
	snakeCase,
} from "lodash";
import type { JsonValue } from "type-fest";
import yaml from "yaml";
import { type $ZodError, type $ZodType, toDotPath, toJSONSchema } from "zod/v4/core";

/**
 * Raw content of the config file as UTF-8.
 */
let cachedConfigFileContent: string | undefined;
/**
 * Parsed YAML file - unknown as we don't know what shape it will have until we validate it.
 */
let parsedConfigFileContent: unknown | undefined;

/**
 * Parses a string content into a JavaScript object using YAML parser.
 * Uses a cached result if the content has been parsed before.
 *
 * @param content - The string content in YAML format to parse
 * @returns The parsed JavaScript object representation of the YAML content
 */
function parseConfig(content: string): unknown {
	if (!isUndefined(parsedConfigFileContent)) return parsedConfigFileContent;

	parsedConfigFileContent = yaml.parse(content);
	return parsedConfigFileContent;
}

/**
 * Reads and parses a configuration file from the filesystem.
 * Uses cached file content if available to prevent multiple filesystem reads.
 *
 * @param path - The path to the configuration file
 * @returns The parsed JavaScript object representation of the file
 * @throws {Error} if the file cannot be read or parsed
 */
function parseConfigFile(path: string) {
	try {
		if (!isString(cachedConfigFileContent))
			cachedConfigFileContent = fs.readFileSync(path).toString("utf8");

		return parseConfig(cachedConfigFileContent);
	} catch (err) {
		const message = err instanceof Error ? err.message : new String(err).toString();
		throw new Error(`Unable to open the config file provided: ${message}`, {
			cause: err,
		});
	}
}

/**
 * Reads configuration from either a string content or a file path.
 * String content takes precedence over file path to avoid unnecessary filesystem operations.
 *
 * @param content - Optional string content in YAML format
 * @param file - Optional path to a configuration file
 * @returns The parsed configuration as a record of string keys to JSON values
 * @throws {Error} if neither content nor file contains a valid configuration object
 */
export function decodeConfig(content?: string, file?: string) {
	let readConfig: unknown = {};
	// NOTE: `content` takes precedence over a `file` (to avoid a file system read in case of both)
	if (isString(content)) readConfig = parseConfig(content);
	else if (isString(file)) readConfig = parseConfigFile(file);

	if (!isObjectLike(readConfig))
		throw new Error(`Config file provided must contain the JSON configuration object`);

	return readConfig as Record<string, JsonValue>;
}

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
 * Attempts to parse a string value as JSON, falling back to the original string if parsing fails.
 * Used for converting environment variables that might contain JSON values to mimic config file read from ENVs as well.
 *
 * @param value - The string value to parse as JSON
 * @returns The parsed JSON value or the original string if parsing fails
 */
function jsonParse(value: string | undefined): JsonValue | undefined {
	try {
		return JSON.parse(value ?? "") as JsonValue;
	} catch {
		return value;
	}
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
	jsonify: (value: string | undefined) => JsonValue | undefined = jsonParse,
): readonly [Record<string, JsonValue | undefined>, Map<string, string>] {
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
			const newValue = jsonify(value);
			return set(env, newKey, newValue);
		},
		{} as Record<string, JsonValue | undefined>,
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
	context: "options" | "config",
	namespace: string,
	envKeys: Map<string, string> = new Map(),
): TypeError => {
	// NOTE: shamelessy copied from `prettifyError`
	const lines: string[] = [];
	const jsonSchema = toJSONSchema(schema, { unrepresentable: "any" });

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

			// use the env key or the path
			const path = toDotPath(issue.path);
			const via = envKeys.get(path) ? ` via ${envKeys.get(path)}` : "";

			lines.push(`  → at ${path}${via}${description}`);
		}
	}

	return new TypeError(`Invalid ${context} for "${namespace}":\n${lines.join("\n")}`, {
		cause: error,
	});
};
