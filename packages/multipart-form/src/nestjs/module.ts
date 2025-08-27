import { type DynamicModule, Module } from "@nestjs/common";

import {
	type ASYNC_OPTIONS_TYPE,
	ConfigurableModuleClass,
	MODULE_OPTIONS_TOKEN,
	type OPTIONS_TYPE,
} from "./module-definition";

/**
 * A dynamic NestJS module for handling multipart/form-data requests.
 *
 * This module provides:
 * - Global configuration for multipart parsing.
 *
 * @example
 * ‍@Module({
 *   imports: [
 *     MultipartModule.register({
 *       limits: { files: 5, fieldSize: 2 * 1024 * 1024 },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 */
@Module({})
export class MultipartModule extends ConfigurableModuleClass {
	static register(options: typeof OPTIONS_TYPE): DynamicModule {
		return {
			...ConfigurableModuleClass.register(options),
			exports: [{ provide: MODULE_OPTIONS_TOKEN, useExisting: MODULE_OPTIONS_TOKEN }],
		};
	}

	static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
		return {
			...ConfigurableModuleClass.registerAsync(options),
			exports: [{ provide: MODULE_OPTIONS_TOKEN, useExisting: MODULE_OPTIONS_TOKEN }],
		};
	}
}
