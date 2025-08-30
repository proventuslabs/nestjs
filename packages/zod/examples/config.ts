import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService, type ConfigType } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { type NamespacedConfigType, registerConfig } from "@proventuslabs/nestjs-zod";

import z from "zod/v4";

const appConfig = registerConfig(
	"app",
	z.object({
		port: z.number().int().min(0).max(65535).describe("The local HTTP port to bind the server to"),
	}),
	{
		variables: { APP_PORT: "abc" },
	},
);

type AppConfig = ConfigType<typeof appConfig>;
type AppConfigNamespaced = NamespacedConfigType<typeof appConfig>;

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [appConfig],
		}),
	],
})
class AppModule {}

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	const logger = new Logger();
	app.useLogger(logger);

	const configService = app.get<ConfigService<AppConfigNamespaced, true>>(ConfigService);
	const portFromService = configService.get("app.port", { infer: true });

	const appConfigObject = app.get<AppConfig>(appConfig.KEY);
	const portFromObject = appConfigObject.port;

	logger.log(`Port from service: ${portFromService}`);
	logger.log(`Port from object: ${portFromObject}`);
}

void bootstrap();
