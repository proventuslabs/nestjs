import { Inject, Injectable, Logger, Module, type OnModuleInit, Optional } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ZodConfigurableModuleBuilder } from "@proventuslabs/nestjs-zod";

import z from "zod/v4";

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } =
	// new ConfigurableModuleBuilder<{ timeout: number }>()
	new ZodConfigurableModuleBuilder(
		z.object({
			timeout: z.number().default(100).describe("Timeout in ms"),
			nested: z.object({ key: z.string().describe("I'm nested key") }),
		}),
		{ warnOnly: true }, // logs warning instead of throwing — app still starts
	)
		.setExtras(
			{
				isGlobal: true,
			},
			(definition, extras) => ({
				...definition,
				global: extras.isGlobal,
			}),
		)
		.build();

@Module({})
export class DynModule extends ConfigurableModuleClass {}

@Injectable()
export class NestedService implements OnModuleInit {
	readonly logger = new Logger(NestedService.name);

	public constructor(
		@Optional() @Inject(MODULE_OPTIONS_TOKEN) readonly options: typeof OPTIONS_TYPE,
	) {}

	onModuleInit() {
		this.logger.log(this.options);
	}
}

@Module({
	providers: [NestedService],
})
export class NestedModule {}

@Module({
	// @ts-expect-error
	imports: [DynModule.register({ timeout: "wtf", nested: { key: 1 } }), NestedModule],
})
class AppModule {}

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	const logger = new Logger();
	app.useLogger(logger);

	const options = app.get<typeof OPTIONS_TYPE>(MODULE_OPTIONS_TOKEN);

	logger.log(options);
}

void bootstrap();
