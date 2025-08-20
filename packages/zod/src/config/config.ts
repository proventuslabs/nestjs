import process from "node:process";

import { type ConfigObject, type ConfigType as NestConfigType, registerAs } from "@nestjs/config";

import { merge } from "lodash";
import type { CamelCase, JsonValue } from "type-fest";
import z from "zod/v4";
import type { $ZodType } from "zod/v4/core";

import { decodeConfig, decodeVariables, typifyError } from "../internal";

/**
 * Simple type alias for config namespace.
 */
type ConfigNamespace<T extends string> = CamelCase<T>;

/**
 * The flattened type of the config.
 *
 * @example
 * const config = registerConfig('app', z.object({ port: z.number() }));
 * type AppConfig = ConfigType<typeof config>;
 * //   ^? { port: number }
 */
export type ConfigType<T extends (...args: unknown[]) => unknown> = NestConfigType<T>;

/**
 * The type of the config for a given namespace.
 *
 * @example
 * const config = registerConfig('app', z.object({ port: z.number() }));
 * type AppConfig = NamespacedConfigType<typeof config>;
 * //   ^? { app: { port: number } }
 */
export type NamespacedConfigType<
	// biome-ignore lint/suspicious/noExplicitAny: needed to prevent circular dependency during infer of the config shape
	R extends ReturnType<typeof registerConfig<string, any, any>>,
> = {
	[K in R["NAMESPACE"]]: NestConfigType<R>;
};

/**
 * Registers a config with the `ConfigModule.forFeature` for partial configuration under the provided namespace.
 *
 * This function handles configuration by validating and merging values from multiple sources:
 * - **Environment Variables:** Reads environment variables as JSON values, using the namespace prefix and validating them against the provided schema.
 * - **Configuration File:** Optionally reads configuration from a file or inline YAML content, specified by the `CONFIG_FILE` or `CONFIG_CONTENT` environment variables respectively.
 *
 * **Merge order is Config File < Enviornment Variables** thus enviornment variables _override_ whatever the config sets.
 *
 * @param namespace - The namespace of the config
 * @param configSchema - The schema of the config
 * @param whitelistKeys - Set of keys to be whitelisted and get passed to the schema as-is
 * @param variables - The environment variables - defaults to `process.env`
 *
 * @throws {TypeError} If the environment variables or configuration file content do not match the schema.
 *
 * @example
 * const ConfigSchema = z.object({
 *   port: z.number().int().min(0).max(65535).default(9558).describe('The local HTTP port to bind the server to'),
 * });
 *
 * export const appConfig = registerConfig('app', ConfigSchema);
 *
 * export type AppConfigNamespaced = NamespacedConfigType<typeof appConfig>;
 * export type AppConfig = ConfigType<typeof appConfig>;
 */
export function registerConfig<
	N extends string,
	C extends ConfigObject,
	I extends JsonValue | unknown,
>(
	namespace: ConfigNamespace<N>,
	configSchema: $ZodType<C, I>,
	options: {
		whitelistKeys?: Set<string>;
		variables?: Record<string, string | undefined>;
	} = {},
) {
	const { variables = process.env, whitelistKeys } = options;

	const service = registerAs(namespace, async () => {
		const [decodedEnv, envKeys] = decodeVariables(variables, namespace, whitelistKeys);
		const decodedConfig = decodeConfig(variables.CONFIG_CONTENT, variables.CONFIG_FILE);

		const namespacedSchema = z.object({
			[namespace]: configSchema,
		});
		const parsedConfig = await namespacedSchema.safeParseAsync(
			merge({ [namespace]: {} }, decodedConfig, decodedEnv),
		);
		if (!parsedConfig.success)
			throw new TypeError(
				typifyError(namespacedSchema, parsedConfig.error, "config", namespace, envKeys),
				{ cause: parsedConfig.error },
			);
		const config = parsedConfig.data[namespace];

		return config;
	}) as ReturnType<typeof registerAs<C>> & { NAMESPACE: N };

	// we add the namespace to the object itself for runtime access too
	return Object.defineProperty(service, "NAMESPACE", {
		value: namespace,
		writable: false,
	});
}

export default registerConfig;
