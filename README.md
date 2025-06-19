# NestJS Packages Monorepo

A collection of high-quality NestJS packages and utilities developed by ProventusLabs to enhance the NestJS ecosystem with modern development practices and type safety.

## 📦 Packages

### [@proventuslabs/nestjs-zod](./packages/zod/)

A comprehensive collection of NestJS modules to integrate Zod into your application with enhanced configuration management and type safety.

**Features:**
- 🔧 Zod-powered configuration management
- 🌍 Environment variable support with automatic parsing
- 📁 YAML configuration file support
- 🏗️ Configurable modules with Zod validation
- 🎯 Full TypeScript support with automatic type inference
- 🔄 Smart merge strategy (env vars override config files)
- 📝 Descriptive error messages

**Installation:**
```bash
npm install @proventuslabs/nestjs-zod
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
