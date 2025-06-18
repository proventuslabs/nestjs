import fs from "node:fs";

import {
	camelCase,
	get,
	head,
	isEmpty,
	isObjectLike,
	isString,
	isUndefined,
	pickBy,
	reduce,
	set,
	snakeCase,
	tail,
} from "lodash";
import type { JsonValue } from "type-fest";
import yaml from "yaml";
import { ZodEffects, ZodObject, ZodTransformer, type ZodTypeAny, type z } from "zod";

/**
 * Raw content of the config file as UTF-8.
 */
let cachedConfigFileContent: string | undefined;
/**
 * Parsed YAML file - unknown as we don't know what shape it will have until we validate it.
 */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
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

	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
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
function jsonify(value: string | undefined): JsonValue | undefined {
	try {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
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
 *   "my_app": {
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
): readonly [Record<string, JsonValue | undefined>, Map<string, string>] {
	const envKeys = new Map<string, string>();
	const envNamespace = snakeCase(namespace).toUpperCase();
	const relevantEnv = pickBy(variables, (_value, key) => key.startsWith(envNamespace));
	const decodedEnv = reduce(
		relevantEnv,
		(env, value, key) => {
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
 * Recursively navigates through a Zod schema to find description metadata at a specific path.
 * Handles various Zod schema types including effects, transformers, and objects.
 *
 * @param path - Array of string keys representing the path in the schema
 * @param schema - The Zod schema to search through
 * @returns The description string if found, otherwise undefined
 */
function findDescriptionInSchemaByPath(path: string[], schema: ZodTypeAny) {
	// we have to work with ZodTypeAny to accept anything, so we disable the unsafe argument check
	if (isEmpty(path)) return schema?.description;
	else if (schema instanceof ZodEffects)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return findDescriptionInSchemaByPath(path, schema.innerType());
	else if (schema instanceof ZodTransformer)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return findDescriptionInSchemaByPath(path, schema.innerType());
	else if (schema instanceof ZodObject)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return findDescriptionInSchemaByPath(tail(path), get(schema.shape, head(path) ?? ""));
	else return schema?.description;
}

/**
 * Converts Zod validation errors into a more descriptive TypeError.
 * Enhances error messages with schema descriptions when available.
 *
 * @param error - The Zod error containing validation issues
 * @param schema - The namespaced schema that was used for validation
 * @param namespace - The configuration namespace for context in error messages
 * @param keys - Map of path strings to user-friendly key names for better error reporting
 * @returns A TypeError with formatted error messages for each validation issue
 */
export function zodErrorToTypeError(
	error: z.ZodError,
	schema: ZodTypeAny,
	namespace: string,
	keys: Map<string, string>,
	isSchemaNamespaced: boolean = true,
) {
	const errorMessages = error.issues.map((err) => {
		const pathNotation = err.path.join(".");
		const path = keys.get(pathNotation) ?? pathNotation;
		const message = err.message;
		const description = findDescriptionInSchemaByPath(
			err.path.map((v) => v.toString()),
			schema,
		);

		return { path, message, description };
	});

	return new ZodConfigError(
		{
			name: namespace,
			description: findDescriptionInSchemaByPath(isSchemaNamespaced ? [namespace] : [], schema),
		},
		errorMessages,
	);
}

/**
 * Simple error wrapper for expressing an invalid config from a zod schema.
 */
export class ZodConfigError extends TypeError {
	public constructor(
		public readonly namespace: {
			name: string;
			description: string | undefined;
		},
		public readonly configErrors: readonly {
			path: string;
			message: string;
			description: string | undefined;
		}[],
		options?: ErrorOptions,
	) {
		const spacing = "    ";
		const title = `Invalid config for "${namespace.name}":\n`;
		const description = isUndefined(namespace.description)
			? ""
			: `${spacing}${namespace.description}\n`;
		const errors = configErrors.map((v) => ZodConfigError.mapError(v, spacing)).join("\n");

		super(title + description + errors, options);
	}

	private static mapError(
		error: { path: string; message: string; description: string | undefined },
		spacing: string,
	) {
		let message = `${spacing}- ${error.path}: ${error.message}`;
		message += isUndefined(error.description) ? "" : `\n${spacing}${error.description}`;
		return message;
	}
}
