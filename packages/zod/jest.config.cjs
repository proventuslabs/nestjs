const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
	testEnvironment: "node",
	transform: {
		...tsJestTransformCfg,
	},
	moduleNameMapper: {
		"@proventuslabs/nestjs-zod": "<rootDir>/dist/index.js",
	},
};