# @proventuslabs/nestjs-zod

A collection of NestJS modules to integrate Zod v4 into your application with enhanced configuration management and type safety.

## ✨ Features

- 🔧 **Zod-powered Configuration**: Type-safe configuration management using Zod schemas (v4)
- 🌍 **Environment Variable Support**: Automatic parsing and validation of environment variables
- 🏗️ **Configurable Modules**: Enhanced NestJS configurable modules with Zod validation
- 🎯 **Type Safety**: Full TypeScript support with automatic type inference
- 🔄 **Merge Strategy**: Environment variables override schema defaults
- 📝 **Descriptive Errors**: Enhanced error messages with schema descriptions

## 📦 Installation

```bash
npm install @proventuslabs/nestjs-zod zod
```

**Peer Dependencies:**

- `@nestjs/common` ^10.0.0 || ^11.0.0
- `@nestjs/config` ^3.0.0 || ^4.0.0
- `zod` ^3.25.0 || ^4.0.0

## 🎯 Quick Start

```typescript
import { Module, Injectable } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  registerConfig,
  type NamespacedConfigType,
} from "@proventuslabs/nestjs-zod";
import { z } from "zod";

// Define configuration schema
const appConfig = registerConfig(
  "app",
  z.object({
    port: z.coerce.number<string | undefined>().default(3000).describe("Server port"),
    host: z.string().default("localhost").describe("Server host"),
    apiKey: z.string().describe("API key for external services"),
  }),
  {
    whitelistKeys: new Set(["API_KEY"]), // Allow API_KEY without APP_ prefix
  }
);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
  ],
})
export class AppModule {}

@Injectable()
export class AppService {
  constructor(
    private configService: ConfigService<
      NamespacedConfigType<typeof appConfig>,
      true
    >
  ) {}

  getAppConfig() {
    return {
      port: this.configService.get("app.port", { infer: true }),
      host: this.configService.get("app.host", { infer: true }),
      apiKey: this.configService.get("app.apiKey", { infer: true }),
    };
  }
}
```

## 🔧 Configuration and Options

It comes out of the box with the support for env variables.

Priority order: **Environment Variables** > **Schema Defaults**

### Environment Variables

Variables are automatically parsed using the namespace prefix:

```bash
# Standard namespaced variables
APP_PORT=8080
APP_HOST=0.0.0.0

# Nested objects using double underscores
APP_DATABASE__HOST=localhost
APP_DATABASE__PORT=5432
```

### Schema defaults

```typescript
// Multiple configuration sources
const dbConfig = registerConfig(
  "database",
  z.object({
    host: z.string().default("localhost"),
    port: z.coerce.number<string | undefined>().default(5432),
    ssl: z.coerce.boolean<string | undefined>().default(false),
  })
);
```

## 📋 API Reference

### `registerConfig`

Registers a type-safe configuration with automatic validation and environment variable parsing.

```typescript
registerConfig(namespace, zodSchema, options?)
```

**Parameters:**

- `namespace`: Configuration namespace (camelCase)
- `zodSchema`: Zod schema for validation
- `options.whitelistKeys`: Environment variables to allow without namespace prefix
- `options.variables`: Environment variables to use (defaults `process.env`)

#### Whitelist Keys

By default, only environment variables with the namespace prefix are processed. You can whitelist additional environment variables to bypass this restriction:

```typescript
const appConfig = registerConfig(
  "app",
  z.object({
    port: z.coerce.number<string | undefined>().default(3000),
    apiKey: z.string().describe("API key from environment"),
  }),
  {
    whitelistKeys: new Set(["API_KEY"]), // Allow API_KEY without APP_ prefix
  }
);
```

```bash
API_KEY=your-secret-key  # Will be mapped to app.apiKey
APP_PORT=8080            # Standard namespaced variable
```

### `ZodConfigurableModuleBuilder`

Create type-safe configurable modules with Zod validation:

```typescript
import { Module } from "@nestjs/common";
import { ZodConfigurableModuleBuilder } from "@proventuslabs/nestjs-zod";
import { z } from "zod";

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ZodConfigurableModuleBuilder(
    z.object({
      apiKey: z.string(),
      baseUrl: z.url().default("https://api.example.com"),
      timeout: z.number().default(5000),
    })
  ).build();

@Module({
  providers: [
    {
      provide: "EXTERNAL_SERVICE",
      useFactory: (options) => new ExternalService(options), // fully typed
      inject: [MODULE_OPTIONS_TOKEN],
    },
  ],
})
export class ExternalServiceModule extends ConfigurableModuleClass {}

// Usage
ExternalServiceModule.register({
  apiKey: "your-key",
  timeout: 10000,
});
```

Offers identical API to the standard NestJS `ConfigurableModuleBuilder`, consult [their docs](https://docs.nestjs.com/fundamentals/dynamic-modules#configurable-module-builder) for usage.

## 🚨 Error Handling

Enhanced validation errors with detailed information:

- Schema descriptions and validation paths
- Original environment variable names
- Uses Zod errors under the hood

## 🎭 Types

```typescript
// Configuration type extraction
type AppConfig = ConfigType<typeof appConfig>;

// Namespaced configuration for ConfigService
type NamespacedConfig = NamespacedConfigType<typeof appConfig>;

// Usage with ConfigService
constructor(
  private configService: ConfigService<NamespacedConfig, true>,
  @Inject(appConfig.KEY)
  private appConfigObject: AppConfig,
) {}
```

## ⚡ Best Practices

- Use descriptive schema descriptions for better error messages
- Leverage whitelist keys for common environment variables
- Combine multiple configuration namespaces for organized settings
- Utilize schema defaults to reduce required environment variables

```typescript
// ✅ Good: Descriptive and well-structured
const appConfig = registerConfig(
  "app",
  z.object({
    port: z.coerce.number<string | undefined>().default(3000).describe("HTTP server port"),
    apiKey: z.string().describe("Third-party API authentication key"),
  }),
  { whitelistKeys: new Set(["API_KEY"]) }
);

// ✅ Good: Multiple namespaces for organization
const dbConfig = registerConfig("database", dbSchema);
const redisConfig = registerConfig("redis", redisSchema);
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](../../CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## 🔗 Links

- [ProventusLabs](https://proventuslabs.com)
- [NestJS Documentation](https://nestjs.com)
- [Zod Documentation](https://zod.dev)
