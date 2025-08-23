# NestJS Packages Monorepo

A collection of high-quality NestJS packages and utilities developed by ProventusLabs to enhance the NestJS ecosystem with modern development practices and type safety.

## 📦 Packages

### [@proventuslabs/nestjs-zod](./packages/zod/)

A comprehensive collection of NestJS modules to integrate Zod into your application with enhanced configuration management and type safety.

**Features:**
- 🔧 **Zod-powered Configuration**: Type-safe configuration management using Zod schemas
- 🌍 **Environment Variable Support**: Automatic parsing and validation of environment variables
- 📁 **Configuration Files**: Support for YAML configuration files
- 🏗️ **Configurable Modules**: Enhanced NestJS configurable modules with Zod validation
- 🎯 **Type Safety**: Full TypeScript support with automatic type inference
- 🔄 **Merge Strategy**: Environment variables override configuration file values
- 📝 **Descriptive Errors**: Enhanced error messages with schema descriptions
- 🔒 **Whitelist Support**: Allow specific environment variables to bypass namespace restrictions

**Installation:**
```bash
npm install @proventuslabs/nestjs-zod
```

### [@proventuslabs/nestjs-multipart-form](./packages/multipart-form/)

A lightweight and efficient NestJS package for handling multipart form data and file uploads with RxJS streaming support and type safety.

**Features:**
- 🔄 **Express Integration**: Built for Express.js applications
- 📁 **RxJS Streaming**: Handle files and fields efficiently with RxJS Observables and Node.js streams
- 🎯 **Type-Safe Decorators**: Built-in decorators with validation and pattern matching support
- 🔧 **Flexible Configuration**: Customizable Busboy configuration options
- 🛡️ **Validation Support**: Required/optional fields with pattern matching (e.g., `^user_` for fields starting with "user_")
- ⚡ **High Performance**: Lightweight implementation with minimal overhead
- 🚨 **Comprehensive Error Handling**: Custom exception filter with proper HTTP status codes

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
