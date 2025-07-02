import { Module } from "@nestjs/common";
import { repl } from "@nestjs/core";

@Module({
	imports: [],
})
class TestModule {}

async function bootstrap() {
	const replServer = await repl(TestModule);
	replServer.setupHistory(".nestjs_repl_history", (err) => {
		if (err) {
			console.error(err);
		}
	});
}

void bootstrap();
