# @proventuslabs/nestjs-zod

A collection of NestJS modules to integrate Zod into your application with enhanced configuration management and type safety.

## Features

- 🔧 **Zod-powered Configuration**: Type-safe configuration management using Zod schemas
- 🌍 **Environment Variable Support**: Automatic parsing and validation of environment variables
- 📁 **Configuration Files**: Support for YAML configuration files
- 🏗️ **Configurable Modules**: Enhanced NestJS configurable modules with Zod validation
- 🎯 **Type Safety**: Full TypeScript support with automatic type inference
- 🔄 **Merge Strategy**: Environment variables override configuration file values
- 📝 **Descriptive Errors**: Enhanced error messages with schema descriptions

## Installation

```bash
npm install @proventuslabs/nestjs-zod
```

## Peer Dependencies

This package requires the following peer dependencies:

- `@nestjs/common` ^10.0.0 || ^11.0.0
- `@nestjs/config` ^3.0.0 || ^4.0.0
- `zod` ^3.0.0

## Quick Start

### Configuration Management

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { registerConfig, type ConfigType } from '@proventuslabs/nestjs-zod';
import { z } from 'zod';

// Define your configuration schema
const appConfig = registerConfig(
  'app',
  z.object({
    port: z
      .number()
      .int()
      .min(0)
      .max(65535)
      .default(3000)
      .describe('The local HTTP port to bind the server to'),
    host: z
      .string()
      .default('localhost')
      .describe('The host to bind the server to'),
    environment: z
      .enum(['development', 'production', 'test'])
      .default('development')
      .describe('The application environment'),
    apiKey: z
      .string()
      .describe('API key for external services'),
  }),
  {
    whitelistKeys: new Set(['API_KEY']), // Allow API_KEY without APP_ prefix
  }
);

// Type inference
type AppConfig = ConfigType<typeof appConfig>;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
  ],
})
export class AppModule {}
```

### Using Configuration

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type NamespacedConfigType } from '@proventuslabs/nestjs-zod';

@Injectable()
export class AppService {
  constructor(
    private configService: ConfigService<NamespacedConfigType<typeof appConfig>, true>
  ) {}

  getPort(): number {
    return this.configService.get('app.port', { infer: true });
  }

  getHost(): string {
    return this.configService.get('app.host', { infer: true });
  }
}
```

## Configuration Sources

The package supports multiple configuration sources with a clear precedence order:

1. **Environment Variables** (highest priority)
2. **Configuration Files** (YAML)
3. **Schema Defaults** (lowest priority)

### Environment Variables

Environment variables are automatically parsed and validated. Use the namespace prefix followed by underscores:

```bash
# For the 'app' namespace
APP_PORT=8080
APP_HOST=0.0.0.0
APP_ENVIRONMENT=production

# Nested configuration using double underscores
APP_DATABASE__HOST=localhost
APP_DATABASE__PORT=5432
APP_DATABASE__NAME=myapp
```

#### Whitelist Keys

By default, only environment variables with the namespace prefix are processed. You can whitelist additional environment variables to bypass this restriction:

```typescript
const appConfig = registerConfig(
  'app',
  z.object({
    port: z.number().default(3000),
    apiKey: z.string().describe('API key from environment'),
  }),
  {
    whitelistKeys: new Set(['API_KEY']), // Allow API_KEY without APP_ prefix
  }
);
```

This allows you to use environment variables like:
```bash
API_KEY=your-secret-key  # Will be mapped to app.apiKey
APP_PORT=8080            # Standard namespaced variable
```

### Configuration Files

Support for YAML configuration files via environment variables:

```bash
# Specify a configuration file
CONFIG_FILE=./config/app.yaml

# Or provide inline YAML content
CONFIG_CONTENT="app:
  port: 8080
  host: 0.0.0.0
  environment: production
  database:
    host: localhost
    port: 5432
    name: myapp"
```

Example `config/app.yaml`:

```yaml
app:
  port: 8080
  host: 0.0.0.0
  environment: production
  database:
    host: localhost
    port: 5432
    name: myapp
  redis:
    host: localhost
    port: 6379
```

## Configurable Modules

Create type-safe configurable modules with Zod validation:

```typescript
import { Module } from '@nestjs/common';
import { ZodConfigurableModuleBuilder } from '@proventuslabs/nestjs-zod';
import { z } from 'zod';

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ZodConfigurableModuleBuilder(
  z.object({
    apiKey: z.string().min(1),
    baseUrl: z.string().url().default('https://api.example.com'),
    timeout: z.number().positive().default(5000),
  })
).build();

@Module({
  providers: [
    {
      provide: 'EXTERNAL_SERVICE',
      useFactory: (options) => {
        // options is fully typed and validated
        return new ExternalService(options);
      },
      inject: [MODULE_OPTIONS_TOKEN],
    },
  ],
  exports: ['EXTERNAL_SERVICE'],
})
export class ExternalServiceModule extends ConfigurableModuleClass {}
```

### Using Configurable Modules

```typescript
// Static configuration
ExternalServiceModule.register({
  apiKey: 'your-api-key',
  baseUrl: 'https://custom-api.example.com',
  timeout: 10000,
});

// Async configuration
ExternalServiceModule.registerAsync({
  useFactory: (configService: ConfigService) => ({
    apiKey: configService.get('EXTERNAL_API_KEY'),
    baseUrl: configService.get('EXTERNAL_BASE_URL'),
    timeout: configService.get('EXTERNAL_TIMEOUT'),
  }),
  inject: [ConfigService],
});
```

## API Reference

### `registerConfig`

Registers a configuration with the `ConfigModule.forFeature` for partial configuration under the provided namespace.

```typescript
function registerConfig<N extends string, C extends ConfigObject, I extends JsonValue>(
  namespace: ConfigNamespace<N>,
  configSchema: ZodType<C, ZodTypeDef, I>,
  options?: {
    whitelistKeys?: Set<string>;
    variables?: Record<string, string | undefined>;
  }
): ReturnType<typeof registerAs<C>> & { NAMESPACE: N }
```

**Parameters:**
- `namespace`: The namespace for the configuration (camelCase)
- `configSchema`: Zod schema for validation
- `options`: Configuration options
  - `whitelistKeys`: Set of environment variable names to allow without namespace prefix
  - `variables`: Environment variables object (defaults to `process.env`)

**Returns:** A configuration provider that can be used with `ConfigModule.forRoot()`

**Example:**
```typescript
const appConfig = registerConfig(
  'app',
  z.object({
    port: z.number().default(3000),
    apiKey: z.string(),
    database: z.object({
      host: z.string().default('localhost'),
      port: z.number().default(5432),
    }),
  }),
  {
    whitelistKeys: new Set(['API_KEY', 'DATABASE_URL']),
  }
);
```

### `ConfigType<T>`

Extracts the inferred type from a configuration schema.

```typescript
type ConfigType<T extends (...args: unknown[]) => unknown> = NestConfigType<T>;
```

### `NamespacedConfigType<T>`

Extracts the namespaced configuration type.

```typescript
type NamespacedConfigType<R> = {
  [K in R["NAMESPACE"]]: NestConfigType<R>;
};
```

### `ZodConfigurableModuleBuilder`

Builder class for creating configurable modules with Zod validation.

```typescript
class ZodConfigurableModuleBuilder<
  ModuleOptions,
  ModuleOptionsInput = unknown,
  StaticMethodKey extends string = string,
  FactoryClassMethodKey extends string = string,
  ExtraModuleDefinitionOptions = object
>
```

## Error Handling

The package provides enhanced error messages that include:

- Schema descriptions when available
- Original environment variable names
- Detailed validation error paths
- Helpful suggestions for fixing configuration issues

Example error output:

```
TypeError: Configuration validation failed for 'app' namespace

  • app.port: Expected number, received string
    Description: The local HTTP port to bind the server to
    Environment Variable: APP_PORT

  • app.database.host: Required
    Description: Database host address
    Environment Variable: APP_DATABASE__HOST
```

## Examples

### Basic Configuration with Whitelist Keys

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { registerConfig, type ConfigType } from '@proventuslabs/nestjs-zod';
import { z } from 'zod';

// Configuration with whitelist support
const appConfig = registerConfig(
  'app',
  z.object({
    port: z.number().default(3000),
    host: z.string().default('localhost'),
    apiKey: z.string().describe('External API key'),
    database: z.object({
      url: z.string().describe('Database connection URL'),
      poolSize: z.number().default(10),
    }),
  }),
  {
    whitelistKeys: new Set(['API_KEY', 'DATABASE_URL']),
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
```

With this configuration, you can use environment variables like:
```bash
# Standard namespaced variables
APP_PORT=8080
APP_HOST=0.0.0.0

# Whitelisted variables (no namespace prefix required)
API_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

### Advanced Configuration with Multiple Sources

```typescript
const databaseConfig = registerConfig(
  'database',
  z.object({
    host: z.string().default('localhost'),
    port: z.number().default(5432),
    name: z.string(),
    username: z.string(),
    password: z.string(),
    ssl: z.boolean().default(false),
  }),
  {
    whitelistKeys: new Set(['DB_HOST', 'DB_PORT', 'DB_NAME']),
  }
);
```

See the [examples](./examples) directory for complete working examples.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.
