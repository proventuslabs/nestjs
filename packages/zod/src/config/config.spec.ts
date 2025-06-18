import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { z } from "zod";

import { registerConfig } from "./config";

describe("config", () => {
	it("should register config with ConfigModule.forFeature", async () => {
		const config = registerConfig("app", z.object({}), {});

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
					.number()
					.positive()
					.min(0)
					.max(65535)
					.default(9556)
					.describe("The local HTTP port to bind the server to"),
			}),
			{},
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
				APP_NOT_MISSING: "not missing",
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
});
