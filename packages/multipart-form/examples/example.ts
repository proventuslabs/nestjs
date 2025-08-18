import { createHash } from "node:crypto";
import { buffer } from "node:stream/consumers";
import { pipeline } from "node:stream/promises";

import { Controller, Logger, Module, Post, UseFilters, UseInterceptors } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import {
	MultipartExceptionFilter,
	MultipartFile,
	type MultipartFileStream,
	MultipartInterceptor,
	MultipartModule,
} from "@proventuslabs/nestjs-multipart-form";

import { parse } from "content-type";
import { firstValueFrom, type Observable } from "rxjs";

@Controller("users")
@UseFilters(MultipartExceptionFilter)
export class UsersController {
	private readonly logger: Logger = new Logger(UsersController.name);

	@Post("avatar")
	@UseInterceptors(MultipartInterceptor({ limits: { files: 1, fieldSize: 1 } }))
	async uploadAvatar(@MultipartFile("file2") file$: Observable<MultipartFileStream>) {
		// this.logger.debug('request hit');
		// return { message: 'done without consuming' };
		const file = await firstValueFrom(file$);

		this.logger.debug(file.truncated);

		const data = await pipeline(file, buffer);

		const md5 = createHash("md5").update(data).digest("hex");
		this.logger.debug(`MD5: ${md5}`);

		return {
			message: "Avatar uploaded successfully",
			md5,
		};
	}
}

@Module({
	imports: [MultipartModule.register({ limits: { parts: 0 } })],
	controllers: [UsersController],
	providers: [],
})
export class AppModule {}

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);

	await app.listen("8080");
}

void bootstrap();
