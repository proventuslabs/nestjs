import {
	type ConfigurableModuleAsyncOptions,
	ConfigurableModuleBuilder,
	type ConfigurableModuleBuilderOptions,
	type DynamicModule,
	type Provider,
} from "@nestjs/common";
import type {
	DEFAULT_FACTORY_CLASS_METHOD_KEY,
	DEFAULT_METHOD_KEY,
} from "@nestjs/common/module-utils/constants";

import { isObject, keys, omit } from "lodash";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";

import { zodErrorToTypeError } from "../internal";

export class ZodConfigurableModuleBuilder<
	ModuleOptions,
	ModuleOptionsInput = unknown,
	StaticMethodKey extends string = typeof DEFAULT_METHOD_KEY,
	FactoryClassMethodKey extends string = typeof DEFAULT_FACTORY_CLASS_METHOD_KEY,
	ExtraModuleDefinitionOptions = object,
> {
	protected base: ConfigurableModuleBuilder<
		ModuleOptionsInput,
		StaticMethodKey,
		FactoryClassMethodKey,
		ExtraModuleDefinitionOptions
	>;

	private transformSet = false;

	public constructor(
		protected readonly schema: ZodType<ModuleOptions, ZodTypeDef, ModuleOptionsInput>,
		protected readonly options: ConfigurableModuleBuilderOptions = {},
		parentBuilder?: ConfigurableModuleBuilder<ModuleOptionsInput>,
	) {
		this.base = new ConfigurableModuleBuilder(options, parentBuilder);
	}

	public setExtras<ExtraModuleDefinitionOptions>(
		extras: ExtraModuleDefinitionOptions,
		transformDefinition: (
			definition: DynamicModule,
			extras: ExtraModuleDefinitionOptions,
		) => DynamicModule = (def) => def,
	) {
		const builder = new ZodConfigurableModuleBuilder<
			ModuleOptions,
			ModuleOptionsInput,
			StaticMethodKey,
			FactoryClassMethodKey,
			ExtraModuleDefinitionOptions
			// biome-ignore lint/suspicious/noExplicitAny: cast this to any for interop with NestJS configurable class
		>(this.schema, this.options, this as any);

		// this was called and we patched
		this.transformSet = true;

		builder.base = this.patchTransform(extras, transformDefinition);

		return builder;
	}

	private patchTransform<ExtraModuleDefinitionOptions>(
		extras: ExtraModuleDefinitionOptions,
		transformDefinition: (
			definition: DynamicModule,
			extras: ExtraModuleDefinitionOptions,
		) => DynamicModule = (def) => def,
	) {
		transformDefinition ??= (definition) => definition;

		const existingTransform = transformDefinition;

		transformDefinition = (definition, extraOptions) => {
			const result = existingTransform(definition, extraOptions);

			return this.transformModuleDefinitionWithSchema(result, extraOptions, extras);
		};

		return this.base.setExtras(extras, transformDefinition);
	}

	public setClassMethodName<StaticMethodKey extends string>(key: StaticMethodKey) {
		const builder = new ZodConfigurableModuleBuilder<
			ModuleOptions,
			ModuleOptionsInput,
			StaticMethodKey,
			FactoryClassMethodKey,
			ExtraModuleDefinitionOptions
			// biome-ignore lint/suspicious/noExplicitAny: cast this to any for interop with NestJS configurable class
		>(this.schema, this.options, this as any);
		builder.base = builder.base.setClassMethodName(key);

		return builder;
	}

	public setFactoryMethodName<FactoryClassMethodKey extends string>(key: FactoryClassMethodKey) {
		const builder = new ZodConfigurableModuleBuilder<
			ModuleOptions,
			ModuleOptionsInput,
			StaticMethodKey,
			FactoryClassMethodKey,
			ExtraModuleDefinitionOptions
			// biome-ignore lint/suspicious/noExplicitAny: cast this to any for interop with NestJS configurable class
		>(this.schema, this.options, this as any);
		builder.base = builder.base.setFactoryMethodName(key);

		return builder;
	}

	public build(): ZodConfigurableModuleHost<
		ModuleOptions,
		ModuleOptionsInput,
		StaticMethodKey,
		FactoryClassMethodKey,
		ExtraModuleDefinitionOptions
	> {
		if (!this.transformSet) this.base = this.patchTransform({} as ExtraModuleDefinitionOptions);

		return this.base.build() as unknown as ZodConfigurableModuleHost<
			ModuleOptions,
			ModuleOptionsInput,
			StaticMethodKey,
			FactoryClassMethodKey,
			ExtraModuleDefinitionOptions
		>;
	}

	private transformModuleDefinitionWithSchema<ExtraModuleDefinitionOptions>(
		definition: DynamicModule,
		extraOptions: ExtraModuleDefinitionOptions,
		extras: unknown,
	): DynamicModule {
		const isOptionProvider = (provider: Provider) =>
			"provide" in provider && provider.provide === this.options.optionsInjectionToken;
		definition.providers = definition.providers?.map((provider) => {
			if (isOptionProvider(provider)) {
				if ("useFactory" in provider) {
					const existingFactory = provider.useFactory;
					provider.useFactory = async (...args) => {
						try {
							return await this.schema.parseAsync(existingFactory(...args));
						} catch (err) {
							if (err instanceof ZodError) {
								throw zodErrorToTypeError(
									err,
									this.schema,
									definition.module.name,
									new Map(),
									false,
								);
							}
							throw err;
						}
					};
				} else {
					return {
						// biome-ignore lint/style/noNonNullAssertion: the token is guaranteed to be set
						provide: this.options.optionsInjectionToken!,
						useFactory: async () => {
							const finalOptions = isObject(extraOptions)
								? omit(extraOptions, keys(extras))
								: extraOptions;
							try {
								return await this.schema.parseAsync(finalOptions);
							} catch (err) {
								if (err instanceof ZodError) {
									throw zodErrorToTypeError(
										err,
										this.schema,
										definition.module.name,
										new Map(),
										false,
									);
								}
								throw err;
							}
						},
					};
				}
			}

			return provider;
		});

		return definition;
	}
}

type ZodConfigurableModuleCls<
	// biome-ignore lint/correctness/noUnusedVariables: the type is needed for completeness interop with NestJS configurable class
	ModuleOptions,
	ModuleOptionsInput = unknown,
	MethodKey extends string = typeof DEFAULT_METHOD_KEY,
	FactoryClassMethodKey extends string = typeof DEFAULT_FACTORY_CLASS_METHOD_KEY,
	ExtraModuleDefinitionOptions = object,
> = {
	// biome-ignore lint/suspicious/noExplicitAny: cast this to any for interop with NestJS configurable class
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

interface ZodConfigurableModuleHost<
	ModuleOptions = Record<string, unknown>,
	ModuleOptionsInput = unknown,
	MethodKey extends string = string,
	FactoryClassMethodKey extends string = string,
	ExtraModuleDefinitionOptions = object,
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
	 * Can be used to auto-infer the compound "async module options" type.
	 * Note: this property is not supposed to be used as a value.
	 *
	 * @example
	 * ```typescript
	 * @Module({})
	 * class IntegrationModule extends ConfigurableModuleCls {
	 *  static module = initializer(IntegrationModule);
	 *
	 * static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
	 *  return super.registerAsync(options);
	 * }
	 * ```
	 */
	OPTIONS_TYPE: ModuleOptions & Partial<ExtraModuleDefinitionOptions>;
	/**
	 * Can be used to auto-infer the compound "module options" type (options interface + extra module definition options).
	 * Note: this property is not supposed to be used as a value.
	 *
	 * @example
	 * ```typescript
	 * @Module({})
	 * class IntegrationModule extends ConfigurableModuleCls {
	 *  static module = initializer(IntegrationModule);
	 *
	 * static register(options: typeof OPTIONS_TYPE): DynamicModule {
	 *  return super.register(options);
	 * }
	 * ```
	 */
	ASYNC_OPTIONS_TYPE: ConfigurableModuleAsyncOptions<ModuleOptions, FactoryClassMethodKey> &
		Partial<ExtraModuleDefinitionOptions>;
}
