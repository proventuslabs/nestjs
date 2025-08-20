import type { ConfigurableModuleAsyncOptions, DynamicModule } from "@nestjs/common";
import type {
	DEFAULT_FACTORY_CLASS_METHOD_KEY,
	DEFAULT_METHOD_KEY,
} from "@nestjs/common/module-utils/constants";

/**
 * Class that represents a blueprint/prototype for a configurable Nest module.
 * This class provides static methods for constructing dynamic modules. Their names
 * can be controlled through the "MethodKey" type argument.
 *
 * @publicApi
 */
export type ZodConfigurableModuleCls<
	// biome-ignore lint/correctness/noUnusedVariables: NestJS monkey types compat
	ModuleOptions,
	ModuleOptionsInput,
	MethodKey extends string = typeof DEFAULT_METHOD_KEY,
	FactoryClassMethodKey extends string = typeof DEFAULT_FACTORY_CLASS_METHOD_KEY,
	// biome-ignore lint/complexity/noBannedTypes: NestJS monkey types compat
	ExtraModuleDefinitionOptions = {},
> = {
	// biome-ignore lint/suspicious/noExplicitAny: NestJS monkey types compat
	new (): any;
} & Record<
	`${MethodKey}`,
	(options: ModuleOptionsInput & Partial<ExtraModuleDefinitionOptions>) => DynamicModule
> &
	Record<
		`${MethodKey}Async`,
		(
			options: ConfigurableModuleAsyncOptions<ModuleOptionsInput, FactoryClassMethodKey> &
				Partial<ExtraModuleDefinitionOptions>,
		) => DynamicModule
	>;

/**
 * Configurable module host. See properties for more details
 *
 * @publicApi
 */
export interface ZodConfigurableModuleHost<
	ModuleOptions,
	ModuleOptionsInput,
	MethodKey extends string = string,
	FactoryClassMethodKey extends string = string,
	// biome-ignore lint/complexity/noBannedTypes: NestJS monkey types compat
	ExtraModuleDefinitionOptions = {},
> {
	/**
	 * Class that represents a blueprint/prototype for a configurable Nest module.
	 * This class provides static methods for constructing dynamic modules. Their names
	 * can be controlled through the "MethodKey" type argument.
	 *
	 * Your module class should inherit from this class to make the static methods available.
	 *
	 * @example
	 * ```typescript
	 * @Module({})
	 * class IntegrationModule extends ConfigurableModuleCls {
	 *  // ...
	 * }
	 * ```
	 */
	ConfigurableModuleClass: ZodConfigurableModuleCls<
		ModuleOptions,
		ModuleOptionsInput,
		MethodKey,
		FactoryClassMethodKey,
		ExtraModuleDefinitionOptions
	>;

	/**
	 * Module options provider token. Can be used to inject the "options object" to
	 * providers registered within the host module.
	 */
	MODULE_OPTIONS_TOKEN: string | symbol;

	/**
	 * @deprecated Use {@link ASYNC_OPTIONS_INPUT_TYPE} instead.
	 */
	ASYNC_OPTIONS_TYPE: ConfigurableModuleAsyncOptions<ModuleOptions, FactoryClassMethodKey>;

	/**
	 * Can be used to auto-infer the compound "async module options" input type.
	 * This is the equivalent of `z.input<OPTIONS SCHEMA>` + the extra module definition options.
	 * Note: this property is not supposed to be used as a value.
	 *
	 * @example
	 * ```typescript
	 * @Module({})
	 * class IntegrationModule extends ConfigurableModuleCls {
	 *  static module = initializer(IntegrationModule);
	 *
	 * static registerAsync(options: typeof ASYNC_OPTIONS_INPUT_TYPE): DynamicModule {
	 *  return super.registerAsync(options);
	 * }
	 * ```
	 */
	ASYNC_OPTIONS_INPUT_TYPE: ConfigurableModuleAsyncOptions<
		ModuleOptionsInput,
		FactoryClassMethodKey
	> &
		Partial<ExtraModuleDefinitionOptions>;

	/**
	 * Can be used to auto-infer the "module options" output type.
	 * This is the equivalent of `z.input<OPTIONS SCHEMA>`.
	 * Note: this property is not supposed to be used as a value.
	 *
	 * @example
	 * ```typescript
	 * export class MyService {
	 *   constructor(
	 *     @Inject(MyModule.MODULE_OPTIONS_TOKEN)
	 *     private readonly options: typeof OPTIONS_TYPE,
	 *   ) {}
	 * }
	 *
	 * // Or in bootstrap code:
	 * const options = app.get<typeof OPTIONS_TYPE>(MyModule.MODULE_OPTIONS_TOKEN);
	 * ```
	 */
	OPTIONS_TYPE: ModuleOptions;

	/**
	 * Can be used to auto-infer the **compound** "module options" input type.
	 * This is the equivalent of `z.input<OPTIONS SCHEMA>` + the extra module definition options.
	 * Note: this property is not supposed to be used as a value.
	 *
	 * @example
	 * ```typescript
	 * @Module({})
	 * class IntegrationModule extends ConfigurableModuleCls {
	 *  static module = initializer(IntegrationModule);
	 *
	 * static register(options: typeof OPTIONS_INPUT_TYPE): DynamicModule {
	 *  return super.register(options);
	 * }
	 * ```
	 */
	OPTIONS_INPUT_TYPE: ModuleOptionsInput & Partial<ExtraModuleDefinitionOptions>;
}
