// biome-ignore-all lint/complexity/noThisInStatic: NestJS monkey types compat
// biome-ignore-all lint/style/noNonNullAssertion: NestJS monkey types compat

import {
	type ConfigurableModuleAsyncOptions,
	type ConfigurableModuleBuilderOptions,
	type ConfigurableModuleOptionsFactory,
	type DynamicModule,
	Logger,
	type Provider,
} from "@nestjs/common";
import {
	ASYNC_METHOD_SUFFIX,
	CONFIGURABLE_MODULE_ID,
	DEFAULT_FACTORY_CLASS_METHOD_KEY,
	DEFAULT_METHOD_KEY,
} from "@nestjs/common/module-utils/constants";

import { $ZodError, type $ZodType, parseAsync } from "zod/v4/core";

import { typifyError } from "../internal";
import type { ZodConfigurableModuleCls, ZodConfigurableModuleHost } from "./module.interfaces";
import {
	generateOptionsInjectionToken,
	getInjectionProviders,
	randomStringGenerator,
} from "./utils";

export class ZodConfigurableModuleBuilder<
	ModuleOptions,
	ModuleOptionsInput,
	StaticMethodKey extends string = typeof DEFAULT_METHOD_KEY,
	FactoryClassMethodKey extends string = typeof DEFAULT_FACTORY_CLASS_METHOD_KEY,
	ExtraModuleDefinitionOptions = object,
> {
	protected staticMethodKey!: StaticMethodKey;
	protected factoryClassMethodKey!: FactoryClassMethodKey;
	protected extras!: ExtraModuleDefinitionOptions;
	protected transformModuleDefinition!: (
		definition: DynamicModule,
		extraOptions: ExtraModuleDefinitionOptions,
	) => DynamicModule;

	protected readonly logger = new Logger(ZodConfigurableModuleBuilder.name);

	public constructor(
		protected readonly schema: $ZodType<ModuleOptions, ModuleOptionsInput>,
		protected readonly options: ConfigurableModuleBuilderOptions = {},
		parentBuilder?: ZodConfigurableModuleBuilder<ModuleOptions, ModuleOptionsInput>,
	) {
		if (parentBuilder) {
			this.staticMethodKey = parentBuilder.staticMethodKey as StaticMethodKey;
			this.factoryClassMethodKey = parentBuilder.factoryClassMethodKey as FactoryClassMethodKey;
			this.transformModuleDefinition = parentBuilder.transformModuleDefinition as (
				definition: DynamicModule,
				extraOptions: ExtraModuleDefinitionOptions,
			) => DynamicModule;
			this.extras = parentBuilder.extras as ExtraModuleDefinitionOptions;
		}
	}

	/**
	 * Registers the "extras" object (a set of extra options that can be used to modify the dynamic module definition).
	 * Values you specify within the "extras" object will be used as default values (that can be overridden by module consumers).
	 *
	 * This method also applies the so-called "module definition transform function" that takes the auto-generated
	 * dynamic module object ("DynamicModule") and the actual consumer "extras" object as input parameters.
	 * The "extras" object consists of values explicitly specified by module consumers and default values.
	 *
	 * @example
	 * ```typescript
	 * .setExtras<{ isGlobal?: boolean }>({ isGlobal: false }, (definition, extras) =>
	 *    ({ ...definition, global: extras.isGlobal })
	 * )
	 * ```
	 */
	setExtras<ExtraModuleDefinitionOptions>(
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
		>(this.schema, this.options, this);
		builder.extras = extras;
		builder.transformModuleDefinition = transformDefinition;
		return builder;
	}

	/**
	 * Dynamic modules must expose public static methods that let you pass in
	 * configuration parameters (control the module's behavior from the outside).
	 * Some frequently used names that you may have seen in other modules are:
	 * "forRoot", "forFeature", "register", "configure".
	 *
	 * This method "setClassMethodName" lets you specify the name of the
	 * method that will be auto-generated.
	 *
	 * @param key name of the method
	 */
	setClassMethodName<StaticMethodKey extends string>(key: StaticMethodKey) {
		const builder = new ZodConfigurableModuleBuilder<
			ModuleOptions,
			ModuleOptionsInput,
			StaticMethodKey,
			FactoryClassMethodKey,
			ExtraModuleDefinitionOptions
		>(this.schema, this.options, this);
		builder.staticMethodKey = key;
		return builder;
	}

	/**
	 * Asynchronously configured modules (that rely on other modules, i.e. "ConfigModule")
	 * let you pass the configuration factory class that will be registered and instantiated as a provider.
	 * This provider then will be used to retrieve the module's configuration. To provide the configuration,
	 * the corresponding factory method must be implemented.
	 *
	 * This method ("setFactoryMethodName") lets you control what method name will have to be
	 * implemented by the config factory (default is "create").
	 *
	 * @param key name of the method
	 */
	setFactoryMethodName<FactoryClassMethodKey extends string>(key: FactoryClassMethodKey) {
		const builder = new ZodConfigurableModuleBuilder<
			ModuleOptions,
			ModuleOptionsInput,
			StaticMethodKey,
			FactoryClassMethodKey,
			ExtraModuleDefinitionOptions
		>(this.schema, this.options, this);
		builder.factoryClassMethodKey = key;
		return builder;
	}

	/**
	 * Returns an object consisting of multiple properties that lets you
	 * easily construct dynamic configurable modules. See "ConfigurableModuleHost" interface for more details.
	 */
	build(): ZodConfigurableModuleHost<
		ModuleOptions,
		ModuleOptionsInput,
		StaticMethodKey,
		FactoryClassMethodKey,
		ExtraModuleDefinitionOptions
	> {
		this.staticMethodKey ??= DEFAULT_METHOD_KEY as StaticMethodKey;
		this.factoryClassMethodKey ??= DEFAULT_FACTORY_CLASS_METHOD_KEY as FactoryClassMethodKey;
		this.options.optionsInjectionToken ??= this.options.moduleName
			? this.constructInjectionTokenString()
			: generateOptionsInjectionToken();
		this.transformModuleDefinition ??= (definition) => definition;

		return {
			ConfigurableModuleClass: this.createConfigurableModuleCls<ModuleOptions>(),
			MODULE_OPTIONS_TOKEN: this.options.optionsInjectionToken,
			ASYNC_OPTIONS_TYPE: this.createTypeProxy("ASYNC_OPTIONS_TYPE"),
			ASYNC_OPTIONS_INPUT_TYPE: this.createTypeProxy("ASYNC_OPTIONS_INPUT_TYPE"),
			OPTIONS_TYPE: this.createTypeProxy("OPTIONS_TYPE"),
			OPTIONS_INPUT_TYPE: this.createTypeProxy("OPTIONS_INPUT_TYPE"),
		};
	}

	private constructInjectionTokenString(): string {
		const moduleNameInSnakeCase = this.options
			.moduleName!.trim()
			.split(/(?=[A-Z])/)
			.join("_")
			.toUpperCase();
		return `${moduleNameInSnakeCase}_MODULE_OPTIONS`;
	}

	private createConfigurableModuleCls<ModuleOptions>(): ZodConfigurableModuleCls<
		ModuleOptions,
		ModuleOptionsInput,
		StaticMethodKey,
		FactoryClassMethodKey
	> {
		const self = this;
		const asyncMethodKey = this.staticMethodKey + ASYNC_METHOD_SUFFIX;

		class InternalModuleClass {
			static [self.staticMethodKey](
				options: ModuleOptionsInput & ExtraModuleDefinitionOptions,
			): DynamicModule {
				const providers: Array<Provider> = [
					{
						provide: self.options.optionsInjectionToken!,
						// NOTE: instead of useValue: this.omitExtras(options, self.extras),
						useFactory: async () => {
							const finalOptions = this.omitExtras(options, self.extras);
							try {
								return await parseAsync(self.schema, finalOptions);
							} catch (err) {
								throw err instanceof $ZodError
									? new TypeError(typifyError(self.schema, err, "options", this.name), {
											cause: err,
										})
									: err;
							}
						},
					},
				];
				if (self.options.alwaysTransient) {
					providers.push({
						provide: CONFIGURABLE_MODULE_ID,
						useValue: randomStringGenerator(),
					});
				}
				return self.transformModuleDefinition(
					{
						module: this,
						providers,
					},
					{
						...self.extras,
						...options,
					},
				);
			}

			static [asyncMethodKey](
				options: ConfigurableModuleAsyncOptions<ModuleOptionsInput> & ExtraModuleDefinitionOptions,
			): DynamicModule {
				const providers = this.createAsyncProviders(options);
				if (self.options.alwaysTransient) {
					providers.push({
						provide: CONFIGURABLE_MODULE_ID,
						useValue: randomStringGenerator(),
					});
				}
				return self.transformModuleDefinition(
					{
						module: this,
						imports: options.imports || [],
						providers,
					},
					{
						...self.extras,
						...options,
					},
				);
			}

			private static omitExtras(
				input: ModuleOptionsInput & ExtraModuleDefinitionOptions,
				extras: ExtraModuleDefinitionOptions | undefined,
			): ModuleOptionsInput {
				if (!extras) {
					return input;
				}
				const moduleOptions = {};
				const extrasKeys = Object.keys(extras);

				Object.keys(input as object)
					.filter((key) => !extrasKeys.includes(key))
					.forEach((key) => {
						// @ts-expect-error: NestJS monkey types compat
						moduleOptions[key] = input[key];
					});
				return moduleOptions as ModuleOptionsInput;
			}

			private static createAsyncProviders(
				options: ConfigurableModuleAsyncOptions<ModuleOptionsInput>,
			): Provider[] {
				if (options.useExisting || options.useFactory) {
					if (options.inject && options.provideInjectionTokensFrom) {
						return [
							this.createAsyncOptionsProvider(options),
							...getInjectionProviders(options.provideInjectionTokensFrom, options.inject),
						];
					}
					return [this.createAsyncOptionsProvider(options)];
				}
				return [
					this.createAsyncOptionsProvider(options),
					{
						provide: options.useClass!,
						useClass: options.useClass!,
					},
				];
			}

			private static createAsyncOptionsProvider(
				options: ConfigurableModuleAsyncOptions<ModuleOptionsInput>,
			): Provider {
				if (options.useFactory) {
					return {
						provide: self.options.optionsInjectionToken!,
						// NOTE: instead of useFactory: options.useFactory,
						useFactory: async (...args) => {
							const finalOptions = await options.useFactory!(...args);
							try {
								return await parseAsync(self.schema, finalOptions);
							} catch (err) {
								throw err instanceof $ZodError
									? new TypeError(typifyError(self.schema, err, "options", this.name), {
											cause: err,
										})
									: err;
							}
						},
						inject: options.inject || [],
					};
				}
				return {
					provide: self.options.optionsInjectionToken!,
					useFactory: async (
						optionsFactory: ConfigurableModuleOptionsFactory<
							ModuleOptionsInput,
							FactoryClassMethodKey
						>,
						// NOTE: instead of => await optionsFactory[self.factoryClassMethodKey as keyof typeof optionsFactory]()
					) => {
						const finalOptions =
							await optionsFactory[self.factoryClassMethodKey as keyof typeof optionsFactory]();
						try {
							return await parseAsync(self.schema, finalOptions);
						} catch (err) {
							throw err instanceof $ZodError
								? new TypeError(typifyError(self.schema, err, "options", this.name), { cause: err })
								: err;
						}
					},
					inject: [options.useExisting || options.useClass!],
				};
			}
		}
		return InternalModuleClass as unknown as ZodConfigurableModuleCls<
			ModuleOptions,
			ModuleOptionsInput,
			StaticMethodKey,
			FactoryClassMethodKey
		>;
	}

	private createTypeProxy(
		typeName:
			| "OPTIONS_TYPE"
			| "ASYNC_OPTIONS_TYPE"
			| "OPTIONS_INPUT_TYPE"
			| "ASYNC_OPTIONS_INPUT_TYPE"
			| "OptionsFactoryInterface",
	) {
		const proxy = new Proxy(
			{},
			{
				get: () => {
					throw new Error(`"${typeName}" is not supposed to be used as a value.`);
				},
			},
		);
		// biome-ignore lint/suspicious/noExplicitAny: NestJS monkey types compat
		return proxy as any;
	}
}
