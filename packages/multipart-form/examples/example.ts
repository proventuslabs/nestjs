import { createHash } from "node:crypto";
import { buffer } from "node:stream/consumers";
import { pipeline } from "node:stream/promises";

import { Controller, Logger, Module, Post, UseFilters, UseInterceptors } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import {
	associateFields,
	collectAssociatives,
	MultipartExceptionFilter,
	type MultipartField,
	MultipartFields,
	type MultipartFileStream,
	MultipartFiles,
	MultipartInterceptor,
	MultipartModule,
} from "@proventuslabs/nestjs-multipart-form";

import { from, map, merge, mergeMap, type Observable, tap, toArray } from "rxjs";

@Controller("upload")
@UseFilters(MultipartExceptionFilter)
export class UploadController {
	private readonly logger: Logger = new Logger(UploadController.name);

	@Post("single-file")
	@UseInterceptors(MultipartInterceptor({ limits: {} }))
	uploadSingleFile(@MultipartFiles("file") file$: Observable<MultipartFileStream>) {
		console.log("controller is resolving");

		const fileProcessing$ = file$.pipe(
			mergeMap((file) =>
				from(pipeline(file, buffer)).pipe(
					map((data) => {
						this.logger.debug(`computing md5 for ${file.fieldname}`);
						const md5 = createHash("md5").update(data).digest("hex");
						return { fieldname: file.fieldname, filename: file.filename, md5 };
					}),
				),
			),
		);

		return fileProcessing$.pipe(toArray());
	}

	@Post("multiple-files")
	@UseInterceptors(MultipartInterceptor({ limits: {} }))
	uploadMultipleFiles(
		@MultipartFiles("file1") file1$: Observable<MultipartFileStream>,
		@MultipartFiles("file2") file2$: Observable<MultipartFileStream>,
		@MultipartFiles([["documents", false]]) documents$: Observable<MultipartFileStream>,
	) {
		const processFile = (file$: Observable<MultipartFileStream>) =>
			file$.pipe(
				mergeMap((file) =>
					from(pipeline(file, buffer)).pipe(
						map((data) => {
							this.logger.debug(`computing md5 for ${file.fieldname}`);
							const md5 = createHash("md5").update(data).digest("hex");
							return { fieldname: file.fieldname, filename: file.filename, md5 };
						}),
					),
				),
			);

		return merge(processFile(file1$), processFile(file2$), processFile(documents$)).pipe(toArray());
	}

	@Post("fields-only")
	@UseInterceptors(MultipartInterceptor({ limits: {} }))
	uploadFieldsOnly(@MultipartFields() fields$: Observable<MultipartField>) {
		const fieldsProcessing$ = fields$.pipe(
			tap((field) => this.logger.debug(`Processing field: ${field.name} = ${field.value}`)),
			associateFields(),
		);

		return fieldsProcessing$.pipe(toArray());
	}

	@Post("mixed-files-fields")
	@UseInterceptors(MultipartInterceptor({ limits: {} }))
	uploadMixedFilesFields(
		@MultipartFiles("avatar") avatar$: Observable<MultipartFileStream>,
		@MultipartFiles("documents") documents$: Observable<MultipartFileStream>,
		@MultipartFields() fields$: Observable<MultipartField>,
	) {
		const fileProcessing$ = merge(avatar$, documents$).pipe(
			mergeMap((file) =>
				from(pipeline(file, buffer)).pipe(
					map((data) => {
						this.logger.debug(`computing md5 for ${file.fieldname}`);
						const md5 = createHash("md5").update(data).digest("hex");
						return { type: "file", fieldname: file.fieldname, filename: file.filename, md5 };
					}),
				),
			),
		);

		const fieldsProcessing$ = fields$.pipe(
			tap((field) => this.logger.debug(`Processing field: ${field.name} = ${field.value}`)),
			map((field) => ({ type: "field", name: field.name, value: field.value })),
		);

		return merge(fileProcessing$, fieldsProcessing$).pipe(toArray());
	}

	@Post("filtered-fields")
	@UseInterceptors(MultipartInterceptor({ limits: {} }))
	uploadFilteredFields(
		@MultipartFields(["name", "email", ["tags[]", false]]) filtered$: Observable<MultipartField>,
		@MultipartFields() all$: Observable<MultipartField>,
	) {
		const filteredProcessing$ = filtered$.pipe(
			tap((field) => this.logger.debug(`Filtered field: ${field.name} = ${field.value}`)),
			map((field) => ({ source: "filtered", name: field.name, value: field.value })),
		);

		const allProcessing$ = all$.pipe(
			tap((field) => this.logger.debug(`All field: ${field.name} = ${field.value}`)),
			map((field) => ({ source: "all", name: field.name, value: field.value })),
		);

		return merge(filteredProcessing$, allProcessing$).pipe(toArray());
	}

	@Post("associative-fields")
	@UseInterceptors(MultipartInterceptor({ limits: {} }))
	uploadAssociativeFields(@MultipartFields() fields$: Observable<MultipartField>) {
		const fieldsProcessing$ = fields$.pipe(
			tap((field) =>
				this.logger.debug(`Processing associative field: ${field.name} = ${field.value}`),
			),
			associateFields(),
			collectAssociatives(),
		);

		return fieldsProcessing$;
	}
}

@Module({
	imports: [MultipartModule.register({ limits: { parts: 0 } })],
	controllers: [UploadController],
	providers: [],
})
export class AppModule {}

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);

	await app.listen("8080");
}

void bootstrap();
