import { Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { z } from "zod";
import { ZodConfigurableModuleBuilder } from "./module";


describe("module", () => {
	const MyOptionSchema = z
		.object({
			useFlags: z.boolean().describe("Whether the use of flag is considered when connecting"),
			clientName: z.string().min(5).describe("The client name used for connecting to the universe"),
		})
		.describe("The options for connecting using the dynamic module")
		.transform((v) => ({ ...v, supportsTransforms: false }))
		.transform(async (v) => ({ ...v, supportsTransforms: true }));
	type MyOption = z.infer<typeof MyOptionSchema>;

	const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ZodConfigurableModuleBuilder(
		MyOptionSchema,
	)
		.setExtras(
			{
				isGlobal: false,
			},
			(definition, extras) => ({
				...definition,
				global: extras.isGlobal,
			}),
		)
		.setClassMethodName("forRoot")
		.build();

	@Module({})
	class DynModule extends ConfigurableModuleClass {}

	it("should register correct options with static synchronous method", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				DynModule.forRoot({
				  useFlags: false,
					clientName: "some long enough client name",
				}),
			],
		}).compile();

		const options = moduleRef.get<MyOption>(MODULE_OPTIONS_TOKEN);

		expect(options).toMatchObject({
			useFlags: true,
			clientName: "some long enough client name",
			supportsTransforms: true,
		});
	});

	it("should register correct options with asynchronous method", async () => {
		const DEFAULTS_TOKEN = "DEFAULT_OPTIONS";
		const defaultsValue = {
			useFlags: false,
		};

		const moduleRef = await Test.createTestingModule({
			imports: [
				DynModule.forRootAsync({
					provideInjectionTokensFrom: [{ provide: DEFAULTS_TOKEN, useValue: defaultsValue }],
					useFactory: (defaults: typeof defaultsValue) => {
						return {
							...defaults,
							clientName: "some long enough client name",
						};
					},
					inject: [{ token: DEFAULTS_TOKEN, optional: false }],
				}),
			],
		}).compile();

		const options = moduleRef.get<MyOption>(MODULE_OPTIONS_TOKEN);

		expect(options).toMatchObject({
			useFlags: false,
			clientName: "some long enough client name",
			supportsTransforms: true,
		});
	});

	it("should throw an error when clientName is too short", async () => {
		await expect(
			Test.createTestingModule({
				imports: [
					DynModule.forRoot({
						useFlags: true,
						clientName: "shor", // Less than 5 characters
					}),
				],
			}).compile(),
		).rejects.toThrow();
	});

	it("should throw an error when required options are missing", async () => {
		await expect(
			Test.createTestingModule({
				imports: [
					// @ts-expect-error: we are passing what could be a complete wrong and unchecked object
					DynModule.forRoot({
						// Missing clientName
						useFlags: true,
					} as unknown),
				],
			}).compile(),
		).rejects.toThrow();
	});

	it("should throw an error when async factory returns invalid options", async () => {
		const DEFAULTS_TOKEN = "INVALID_DEFAULTS";
		const defaultsValue = {
			useFlags: false,
		};

		await expect(
			Test.createTestingModule({
				imports: [
					DynModule.forRootAsync({
						provideInjectionTokensFrom: [{ provide: DEFAULTS_TOKEN, useValue: defaultsValue }],
						useFactory: (defaults: typeof defaultsValue) => {
							return {
								...defaults,
								clientName: "bad", // Too short
							};
						},
						inject: [{ token: DEFAULTS_TOKEN, optional: false }],
					}),
				],
			}).compile(),
		).rejects.toThrow();
	});

	it("should throw an error when invalid option types are provided", async () => {
		await expect(
			Test.createTestingModule({
				imports: [
					DynModule.forRoot({
						// @ts-expect-error: we are passing a wrong and unchecked field
						useFlags: "not-a-boolean" as unknown, // Wrong type
						clientName: "some long enough client name",
					}),
				],
			}).compile(),
		).rejects.toThrow();
	});

	it("should throw an error when injected token is not found and not optional", async () => {
		const NON_EXISTENT_TOKEN = "NON_EXISTENT_TOKEN";

		await expect(
			Test.createTestingModule({
				imports: [
					DynModule.forRootAsync({
						useFactory: () => ({
							useFlags: true,
							clientName: "some long enough client name",
						}),
						inject: [{ token: NON_EXISTENT_TOKEN, optional: false }],
					}),
				],
			}).compile(),
		).rejects.toThrow();
	});
});
