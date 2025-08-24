import { ConfigurableModuleBuilder } from "@nestjs/common";

import type { MultipartOptions } from "../core/types";

/**
 * Configurable module builder for the MultipartModule.
 * Provides tokens and types for dependency injection and module configuration.
 */
export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, ASYNC_OPTIONS_TYPE, OPTIONS_TYPE } =
	new ConfigurableModuleBuilder<MultipartOptions>()
		.setExtras(
			{
				isGlobal: false,
			},
			(definition, extras) => ({
				...definition,
				global: extras.isGlobal,
			}),
		)
		.build();
