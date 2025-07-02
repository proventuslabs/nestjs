import { buffer } from "node:stream/consumers";
import { pipeline } from "node:stream/promises";

import { Controller, Logger, Module, Post, Req, UseInterceptors } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import {
	MultipartFile,
	type MultipartFileUpload,
	MultipartInterceptor,
} from "@proventuslabs/nestjs-multipart-form";

import { parse } from "content-type";
import type { Request } from "express";

@Controller("users")
export class UsersController {
	private readonly logger: Logger = new Logger(UsersController.name);

	@Post("avatar")
	@UseInterceptors(MultipartInterceptor())
	async uploadAvatar(@MultipartFile("file") file: MultipartFileUpload, @Req() req: Request) {
		this.logger.debug(req.body);

		this.logger.debug(file.filename, file.readable);

		const type = parse(file.mimetype);
		this.logger.debug(type);

		const data = await pipeline(file, buffer);
		this.logger.debug(data.toString("utf-8"));

		return {
			message: "Avatar uploaded successfully",
		};
	}
}

@Module({
	imports: [],
	controllers: [UsersController],
	providers: [],
})
export class AppModule {}

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);

	await app.listen("8080");
}

void bootstrap();
