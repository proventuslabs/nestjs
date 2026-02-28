import { Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { z } from "zod/v4";

import { registerConfig } from "./config";

describe("config", () => {
	it("should register config with ConfigModule.forFeature", async () => {
		const config = registerConfig("app", z.object({}));

		const moduleRef = await Test.createTestingModule({
			imports: [ConfigModule.forFeature(config)],
		}).compile();

		const configService = moduleRef.get(ConfigService);

		expect(configService).toBeDefined();
	});

	it("should return the correct config", async () => {
		const config = registerConfig(
			"app",
			z.object({
				port: z.coerce
					.number<string | undefined>()
					.positive()
					.min(0)
					.max(65535)
					.default(9556)
					.describe("The local HTTP port to bind the server to"),
			}),
		);

		const moduleRef = await Test.createTestingModule({
			imports: [ConfigModule.forFeature(config)],
		}).compile();

		const configService = moduleRef.get(ConfigService);

		expect(configService.get("app")).toEqual({
			port: 9556,
		});
	});

	it("should throw an error if the config is invalid", async () => {
		const config = registerConfig(
			"app",
			z.object({
				missing: z.string().describe("This is a required field"),
			}),
			{
				variables: {
					APP_NOT_MISSING: "not missing",
				},
			},
		);

		const moduleRef = Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({ ignoreEnvFile: true, load: [] }),
				ConfigModule.forFeature(config),
			],
		}).compile();

		await expect(moduleRef).rejects.toThrow();
	});

	it("should blacklist key/value pairs by default", async () => {
		const config = registerConfig(
			"app",
			z.object({
				notScoped: z.string().describe("This is a required field"),
			}),
			{
				variables: {
					NOT_SCOPED: "not missing",
				},
			},
		);

		const moduleRef = Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({ ignoreEnvFile: true, load: [] }),
				ConfigModule.forFeature(config),
			],
		}).compile();

		await expect(moduleRef).rejects.toThrow();
	});

	it("should not throw with warnOnly and return raw values on invalid config", async () => {
		const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();

		const config = registerConfig(
			"app",
			z.object({
				missing: z.string().describe("This is a required field"),
			}),
			{
				warnOnly: true,
				variables: {
					APP_NOT_MISSING: "not missing",
				},
			},
		);

		const moduleRef = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({ ignoreEnvFile: true, load: [] }),
				ConfigModule.forFeature(config),
			],
		}).compile();

		const configService = moduleRef.get(ConfigService);

		expect(configService.get("app")).toEqual({
			notMissing: "not missing",
		});
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid config for "app"'));

		warnSpy.mockRestore();
	});

	it("should still return parsed/transformed data with warnOnly when config is valid", async () => {
		const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();

		const config = registerConfig(
			"app",
			z.object({
				port: z.coerce
					.number<string | undefined>()
					.positive()
					.min(0)
					.max(65535)
					.default(9556)
					.describe("The local HTTP port to bind the server to"),
			}),
			{
				warnOnly: true,
			},
		);

		const moduleRef = await Test.createTestingModule({
			imports: [ConfigModule.forFeature(config)],
		}).compile();

		const configService = moduleRef.get(ConfigService);

		expect(configService.get("app")).toEqual({
			port: 9556,
		});
		expect(warnSpy).not.toHaveBeenCalled();

		warnSpy.mockRestore();
	});

	it("should allow to whitelist key/value pairs", async () => {
		const config = registerConfig(
			"app",
			z.object({
				notScoped: z.string().describe("This is a required field"),
			}),
			{
				whitelistKeys: new Set(["NOT_SCOPED"]),
				variables: {
					NOT_SCOPED: "not missing",
				},
			},
		);

		const moduleRef = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({ ignoreEnvFile: true, load: [] }),
				ConfigModule.forFeature(config),
			],
		}).compile();

		const configService = moduleRef.get(ConfigService);

		expect(configService.get("app")).toEqual({
			notScoped: "not missing",
		});
	});
});
