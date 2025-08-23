import { createHash } from "node:crypto";
import { buffer } from "node:stream/consumers";
import { pipeline } from "node:stream/promises";

import { Controller, Logger, Module, Post, UseFilters, UseInterceptors } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import {
	MultipartExceptionFilter,
	type MultipartField,
	MultipartFields,
	type MultipartFileStream,
	MultipartFiles,
	MultipartInterceptor,
	MultipartModule,
} from "@proventuslabs/nestjs-multipart-form";

import { from, map, merge, mergeMap, type Observable, toArray } from "rxjs";

@Controller("users")
@UseFilters(MultipartExceptionFilter)
export class UsersController {
	private readonly logger: Logger = new Logger(UsersController.name);

	@Post("avatar")
	@UseInterceptors(MultipartInterceptor({ limits: {} }))
	uploadAvatar(
		@MultipartFiles(["file", ["file3", false]]) files$: Observable<MultipartFileStream>,
		@MultipartFields(["name", ["meta", false]]) fields$: Observable<MultipartField>,
	) {
		const fileProcessing$ = files$.pipe(
			mergeMap((file) =>
				from(pipeline(file, buffer)).pipe(
					map((data) => {
						this.logger.debug(`computing md5 for ${file.fieldname}`);
						const md5 = createHash("md5").update(data).digest("hex");
						return { fieldname: file.fieldname, md5 };
					}),
				),
			),
		);
		const fieldsProcessing$ = fields$.pipe(
			map((field) => ({
				type: "field",
				name: field.name,
				value: field.value,
			})),
		);

		return merge(fileProcessing$, fieldsProcessing$).pipe(toArray());
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
