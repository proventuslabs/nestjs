import { ConfigurableModuleBuilder } from "@nestjs/common";

import type { MultipartOptions } from "./multipart.types";

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
