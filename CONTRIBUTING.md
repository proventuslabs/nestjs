# Contributing to NestJS Packages

Thank you for your interest in contributing to our NestJS packages! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Git

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/nestjs.git
   cd nestjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make your changes and test**
   ```bash
   npm run build
   npm run test
   npm run lint
   ```

## 📝 Development Guidelines

### Code Style

We use [Biome](https://biomejs.dev/) for code formatting and linting. Please ensure your code follows our standards:

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. Please follow this format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(zod): add support for custom validation schemas
fix(zod): resolve environment variable parsing issue
docs: update README with new examples
```

### Testing

- Write tests for new features
- Ensure all existing tests pass
- Aim for good test coverage
- Use descriptive test names

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### TypeScript

- Use strict TypeScript configuration
- Provide proper type definitions
- Avoid `any` types when possible
- Use generics for reusable components

## 🔄 Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following the guidelines above
3. **Test thoroughly** - ensure all tests pass
4. **Update documentation** if needed
5. **Submit a pull request** with a clear description

### Pull Request Guidelines

- **Title**: Use conventional commit format
- **Description**: Explain what the PR does and why
- **Related Issues**: Link to any related issues
- **Breaking Changes**: Clearly mark if breaking changes are included
- **Screenshots**: Include screenshots for UI changes if applicable

### Example PR Description

```markdown
## Description
Adds support for custom validation schemas in the Zod configuration module.

## Changes
- Added `CustomSchemaConfig` interface
- Implemented schema validation logic
- Added comprehensive tests
- Updated documentation

## Breaking Changes
None

## Related Issues
Closes #123

## Testing
- [x] All tests pass
- [x] Added new test cases
- [x] Manual testing completed
```

## 🐛 Reporting Issues

When reporting issues, please include:

- **Description**: Clear description of the problem
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment**: Node.js version, OS, package versions
- **Screenshots**: If applicable

## 📚 Documentation

When contributing documentation:

- Use clear, concise language
- Include code examples
- Update both README and API documentation
- Follow existing documentation style

## 🏷️ Release Process

Releases are managed using [Release Please](https://github.com/googleapis/release-please-action). The process is automated based on conventional commits.

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow the [Code of Conduct](./CODE_OF_CONDUCT.md)

## 📞 Getting Help

- **Issues**: [GitHub Issues](https://github.com/proventuslabs/nestjs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/proventuslabs/nestjs/discussions)
- **Email**: info@proventuslabs.com

## 🙏 Recognition

Contributors will be recognized in:
- Repository contributors list
- Release notes
- Documentation acknowledgments

Thank you for contributing to the NestJS ecosystem! 🎉 
