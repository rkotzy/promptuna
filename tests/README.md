# Promptuna SDK Testing

This directory contains comprehensive tests for the Promptuna SDK, ensuring robust functionality and reliability.

## Test Structure

```
tests/
├── fixtures/           # Test data and utilities
│   ├── assertions.ts   # Common test assertions
│   ├── configs.ts      # Test configuration fixtures
│   ├── mock-responses.ts # Mock provider responses
│   ├── providers.ts    # Provider test utilities
│   ├── test-utils.ts   # Common test fixtures and mock factories
│   ├── times.ts        # Time-based test fixtures
│   └── users.ts        # User context fixtures
├── helpers/            # Test helper functions
│   └── time.ts         # Time manipulation helpers
├── integration/        # End-to-end integration tests
│   └── promptuna.test.ts
├── unit/               # Unit tests organized by module
│   ├── config/         # Configuration loading and validation
│   ├── fallbacks/      # Fallback executor tests
│   ├── observability/  # Telemetry and analytics tests
│   ├── providers/      # Provider implementation tests
│   ├── routing/        # Routing and variant selection
│   ├── shared/         # Parameter normalization utilities
│   ├── templates/      # Template processing
│   ├── types/          # Type compilation tests
│   └── validate/       # CLI validation tests
└── setup.ts            # Global test setup and mocking

```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Test Categories

```bash
# Unit tests only
npm test tests/unit/

# Integration tests only
npm test tests/integration/

# Specific test file
npm test tests/unit/routing/selector.test.ts

# Tests matching pattern
npm test --run --reporter=verbose routing
```

## Test Coverage

The test suite aims for comprehensive coverage of core functionality:

- **Routing Logic**: 97% coverage - Tests deterministic variant selection, tag-based routing, phased rollouts
- **Template Processing**: 98.5% coverage - Tests Liquid template rendering, custom filters, variable interpolation
- **Config Validation**: 85%+ coverage - Tests JSON schema validation, business rule validation, error handling
- **Parameter Normalization**: 97% coverage - Tests provider-specific parameter mapping and constraints
- **Provider Error Handling**: Comprehensive error testing for all providers (OpenAI, Anthropic, Google)

### Coverage Thresholds

The project enforces minimum coverage thresholds:
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## Test Architecture

### Fixtures and Utilities

**Fixtures** provide organized test data:
- **`test-utils.ts`**: Main test utilities and configuration fixtures
- **`configs.ts`**: Pre-configured test configurations for different scenarios
- **`mock-responses.ts`**: Mock provider responses with realistic data
- **`providers.ts`**: Provider test utilities and factories
- **`assertions.ts`**: Common test assertions and validation helpers
- **`users.ts`**: User context fixtures for routing tests
- **`times.ts`**: Time-based fixtures for phased rollout testing

### Mocking Strategy

Tests use comprehensive mocking to ensure isolation:
- **File System**: Mocked `fs/promises` for config loading
- **Crypto**: Mocked `crypto` for deterministic routing
- **Providers**: Mocked OpenAI, Anthropic, and Google providers
- **Observability**: Mocked telemetry handlers

### Unit Tests

Each module has dedicated unit tests:

- **Config Tests**: Validate configuration loading, JSON schema validation, and error handling
- **Fallbacks Tests**: Test fallback executor logic and error recovery
- **Observability Tests**: Verify telemetry collection, timing, and analytics
- **Provider Tests**: Test all provider implementations with comprehensive error handling
- **Routing Tests**: Test variant selection algorithms, routing rules, and edge cases
- **Shared Tests**: Test parameter normalization across different providers
- **Template Tests**: Verify Liquid template processing, custom filters, and variable interpolation
- **Types Tests**: Test TypeScript compilation and type definitions
- **Validate Tests**: Test CLI validation and configuration checking

### Integration Tests

Integration tests validate end-to-end workflows:
- Configuration loading and caching
- Template processing with real configurations
- Error handling and edge cases
- Concurrent operations

## Development Workflow

### Adding New Tests

1. **Unit Tests**: Add to appropriate `tests/unit/` subdirectory
2. **Integration Tests**: Add to `tests/integration/`
3. **Fixtures**: Update `test-utils.ts` with new test data

### Test Patterns

```typescript
// Standard test structure
describe('ModuleName', () => {
  let instance: ModuleName;
  
  beforeEach(() => {
    vi.clearAllMocks();
    instance = new ModuleName();
  });
  
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test implementation
    });
    
    it('should handle edge case', () => {
      // Test implementation
    });
    
    it('should handle error case', () => {
      // Test implementation
    });
  });
});
```

### Mock Patterns

```typescript
// Mock external dependencies
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// Mock with return values
mockReadFile.mockResolvedValue(JSON.stringify(testConfigs.valid));

// Mock with implementations
mockProvider.mockImplementation(() => ({
  chatCompletion: vi.fn().mockResolvedValue(mockResponse),
}));
```

## Continuous Integration

Tests run automatically on:
- Push to `main` and `develop` branches
- Pull requests to `main` and `develop`
- Multiple Node.js versions (18.x, 20.x)

CI pipeline includes:
- Code formatting checks
- Type checking
- Full test suite with coverage
- Security audit
- Build verification

## Debugging Tests

### Common Issues

1. **Mock Issues**: Ensure mocks are properly configured in `beforeEach`
2. **Async Issues**: Use `await` with async operations
3. **Type Issues**: Check TypeScript configuration in `tsconfig.test.json`

### Debug Commands

```bash
# Run specific test with verbose output
npm test -- --reporter=verbose specific.test.ts

# Run tests with debug mode
npm test -- --inspect-brk

# Run tests with coverage and open HTML report
npm run test:coverage && open coverage/index.html
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not affect others
2. **Clear Names**: Test names should describe expected behavior
3. **Mock External Dependencies**: Mock all external systems and APIs
4. **Test Edge Cases**: Include error conditions and boundary cases
5. **Maintain Fixtures**: Keep test data up-to-date with schema changes

## Contributing

When adding new features:
1. Write tests first (TDD approach recommended)
2. Ensure all tests pass
3. Maintain or improve coverage thresholds
4. Update test documentation as needed

For questions or improvements to the test suite, please consult the main project documentation or open an issue.