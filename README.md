# @proventuslabs/nestjs

A collection of high-quality NestJS packages and utilities developed by ProventusLabs to enhance the NestJS ecosystem with modern development practices and type safety.

## ✨ Overview

This monorepo contains specialized NestJS packages designed to solve common challenges in modern web application development. Each package follows best practices for type safety, performance, and developer experience.

## 📦 Packages

### [@proventuslabs/nestjs-zod](./packages/zod/)

A collection of NestJS modules to integrate Zod v4 into your application with enhanced configuration management and type safety.

**Features:**

- 🔧 **Zod-powered Configuration**: Type-safe configuration management using Zod v4 schemas
- 🌍 **Environment Variable Support**: Automatic parsing and validation of environment variables
- 🏗️ **Configurable Modules**: Enhanced NestJS configurable modules with Zod validation
- 🎯 **Type Safety**: Full TypeScript support with automatic type inference
- 🔄 **Merge Strategy**: Environment variables override schema defaults
- 📝 **Descriptive Errors**: Enhanced error messages with schema descriptions
- 🔒 **Whitelist Support**: Allow specific environment variables to bypass namespace restrictions

**Installation:**

```bash
npm install @proventuslabs/nestjs-zod
```

### [@proventuslabs/nestjs-multipart-form](./packages/multipart-form/)

A lightweight and efficient NestJS package for handling multipart form data and file uploads with RxJS streaming support and type safety.

**Features:**

- 🔄 **RxJS Streaming**: Process files/fields as they arrive
- 🎯 **Type-Safe**: Full TypeScript support with `MultipartFileStream` and `MultipartFileBuffer`
- 🔧 **Composable Operators**: Reusable operators for filtering, validation, and transformation
- 🛡️ **Pattern Matching**: Support for exact matches and "starts with" patterns (`^prefix_`)
- 🚨 **Error Handling**: Built-in validation with proper HTTP status codes

**Installation:**

```bash
npm install @proventuslabs/nestjs-multipart-form
```

## 🛠️ Development

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

### Setup

```bash
# Clone the repository
git clone https://github.com/proventuslabs/nestjs.git
cd nestjs

# Install dependencies
npm install

# Build all packages
npm run build
```

### Available Scripts

- `npm run build` - Build all packages
- `npm run test` - Run tests across all packages
- `npm run lint` - Lint all packages using Biome
- `npm run format` - Format code using Biome

### Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🤝 Support

- **Issues**: [GitHub Issues](https://github.com/proventuslabs/nestjs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/proventuslabs/nestjs/discussions)

## 🔗 Links

- [ProventusLabs](https://proventuslabs.com)
- [NestJS Documentation](https://nestjs.com)
- [Zod Documentation](https://zod.dev)
- [RxJS Documentation](https://rxjs.dev)
