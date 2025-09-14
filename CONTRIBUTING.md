# Contributing to Cronx

Thank you for your interest in contributing to Cronx! This guide will help you get started with development and understand our contribution process.

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- Docker and Docker Compose (for testing different storage backends)
- Git

### Getting Started

1. Fork and clone the repository:
```bash
git clone https://github.com/your-username/cronx.git
cd cronx
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Run tests:
```bash
npm test
```

## Project Structure

```
cronx/
├── packages/
│   ├── core/           # Main Cronx library
│   ├── cli/            # Command-line interface
│   └── ui/             # Web dashboard (Next.js)
├── examples/           # Usage examples and Docker configs
├── docs/              # Documentation
└── tests/             # Test files
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation when needed
- Ensure TypeScript types are properly defined

### 3. Testing

Run the full test suite:
```bash
npm test
```

Test specific packages:
```bash
npm test --workspace=packages/core
npm test --workspace=packages/cli
```

### 4. Manual Testing

Test with different storage backends:
```bash
# Redis
docker-compose -f examples/docker-compose.redis.yml up

# PostgreSQL
docker-compose -f examples/docker-compose.postgres.yml up

# SQLite
docker-compose -f examples/docker-compose.sqlite.yml up
```

## Coding Standards

### TypeScript

- Use strict TypeScript settings
- Provide proper type definitions for all public APIs
- Avoid `any` types unless absolutely necessary
- Use interfaces for object shapes and types for unions

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons at the end of statements
- Use meaningful variable and function names
- Keep functions small and focused

### Documentation

- Add JSDoc comments for public APIs
- Include code examples in documentation
- Update README files when adding new features
- Keep documentation up to date with code changes

## Storage Adapter Development

When adding a new storage adapter:

1. Implement the `StorageAdapter` interface in `packages/core/src/storage/`
2. Add proper error handling and logging
3. Include distributed locking support
4. Add comprehensive tests
5. Update documentation and examples

Example adapter structure:
```typescript
export class MyStorageAdapter implements StorageAdapter {
  async saveJob(job: Job): Promise<void> {
    // Implementation
  }
  
  async getJobs(): Promise<Job[]> {
    // Implementation
  }
  
  async acquireLock(jobId: string, workerId: string, ttl: number): Promise<boolean> {
    // Implementation
  }
  
  // ... other methods
}
```

## Testing Guidelines

### Unit Tests

- Test all public methods
- Mock external dependencies
- Use descriptive test names
- Group related tests in `describe` blocks

### Integration Tests

- Test storage adapters with real databases
- Test clustering scenarios
- Test error conditions and recovery

### Performance Tests

- Benchmark critical paths
- Test with high job volumes
- Measure memory usage and cleanup

## Submitting Changes

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add a clear description of changes
4. Reference any related issues
5. Request review from maintainers

### Commit Messages

Use clear, descriptive commit messages:
```
feat: add Redis cluster support for high availability
fix: resolve memory leak in job cleanup process
docs: update storage adapter documentation
test: add integration tests for PostgreSQL adapter
```

### PR Template

When creating a pull request, include:

- **Description**: What does this PR do?
- **Type of Change**: Bug fix, feature, documentation, etc.
- **Testing**: How was this tested?
- **Breaking Changes**: Any breaking changes?
- **Related Issues**: Link to relevant issues

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes (backward compatible)

### Changelog

Update `CHANGELOG.md` with:
- New features
- Bug fixes
- Breaking changes
- Deprecations

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Help others learn and grow
- Focus on what's best for the community
- Show empathy and kindness

### Getting Help

- Check existing issues and documentation
- Ask questions in GitHub Discussions
- Join our community chat (if available)
- Tag maintainers for urgent issues

### Reporting Issues

When reporting bugs:
1. Check if the issue already exists
2. Provide clear reproduction steps
3. Include system information
4. Add relevant logs and error messages
5. Describe expected vs actual behavior

### Feature Requests

When requesting features:
1. Explain the use case and problem
2. Describe the proposed solution
3. Consider alternative approaches
4. Discuss implementation complexity

## Development Tips

### Working with Storage Adapters

```bash
# Test with Redis
STORAGE_URL=redis://localhost:6379 npm run dev

# Test with PostgreSQL
STORAGE_URL=postgresql://user:pass@localhost:5432/cronx npm run dev

# Test with SQLite
STORAGE_URL=sqlite://./test.db npm run dev
```

### Debugging

- Use the web UI for visual debugging: `npm run ui`
- Enable debug logging: `DEBUG=cronx:* npm run dev`
- Use Docker for isolated testing environments

### Performance Testing

```bash
# Run performance benchmarks
npm run benchmark

# Test with high job volumes
npm run stress-test
```

## Useful Commands

```bash
# Development
npm run dev              # Start development mode
npm run build           # Build all packages
npm run clean           # Clean build artifacts

# Testing
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report

# Linting
npm run lint            # Check code style
npm run lint:fix        # Fix auto-fixable issues

# Examples
npm run example:basic   # Run basic example
npm run example:redis   # Run Redis example
npm run ui              # Start web dashboard
```

## License

By contributing to Cronx, you agree that your contributions will be licensed under the same license as the project.

## Questions?

Feel free to reach out if you have questions about contributing. We're here to help make your contribution experience smooth and enjoyable!