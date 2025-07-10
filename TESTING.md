# Testing Documentation

## Overview

This document describes the testing setup and strategy for the Zustand CRUD Registry library.

## Test Structure

### Test Files

- **`basic.test.ts`** - Basic functionality tests (5 tests)
- **`comprehensive.test.ts`** - Complete feature coverage (21 tests)
- **`config.test.ts`** - Configuration validation and route handling (10 tests)
- **`createStoreRegistry.test.ts`** - Core store registry functionality (9 tests)

### Test Utilities

- **`testUtils.ts`** - Basic test utilities, mock data, and simple Axios mocking
- **`testHelpers.ts`** - Advanced test helpers and utilities
- **`setupTests.ts`** - Jest setup configuration

## Testing Strategy

### Unit Tests
- Test individual functions and components in isolation
- Mock external dependencies (Axios) with simple Jest mocks
- Focus on edge cases and error conditions

### Integration Tests
- Test complete workflows from start to finish
- Verify that components work together correctly
- Test real-world usage scenarios

### Core Library Testing
- Test store creation and management
- Test CRUD operations without React dependencies
- Test loading state management and configuration validation

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run a specific test file
npm test -- basic.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should create store"
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI/CD tools
- `coverage/coverage-final.json` - JSON coverage data

## Test Coverage Goals

- **Functions**: 90%+ coverage
- **Lines**: 90%+ coverage
- **Branches**: 85%+ coverage
- **Statements**: 90%+ coverage

## Mock Strategy

### Axios Mocking
We use simple Jest mocks for HTTP requests:

```typescript
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn()
};
```

### No React Dependencies
- Tests focus on core library functionality
- No React Testing Library dependencies
- Simple, fast execution without DOM rendering

## Test Data

### Mock Users
```typescript
const mockUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com' },
];
```

## Common Test Patterns

### Testing Store Operations
```typescript
const store = getOrCreateStore('users', {
  axios: mockAxios,
  route: '/users',
  actions: { getList: true }
});

const state = store.getState();
state.setList(mockUsers);
expect(store.getState().record).toEqual({
  1: mockUsers[0],
  2: mockUsers[1],
  3: mockUsers[2]
});
```

### Testing Configuration
```typescript
const config = { axios: mockAxios, route: '/users' };
const validated = validateConfig(config);
expect(validated.id).toBe('id');
expect(validated.route).toBe('/users');
```

### Testing Loading States
```typescript
state.setLoadingState('getList', { isLoading: true });
const loadingState = store.getState().loadingState.getList;
expect(loadingState.isLoading).toBe(true);
expect(loadingState.sequence).toBe(0);
```

## Test Results

The tests cover the core library functionality comprehensively:

- **95%+ coverage** of core functionality
- **All CRUD operations** tested
- **State management** verified
- **Configuration validation** complete
- **Error handling** covered
- **Multiple store scenarios** tested

## Writing New Tests

### Test File Structure
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  describe('specific functionality', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

### Test Naming Convention
- Use descriptive test names that explain what is being tested
- Start with "should" for expected behavior
- Include the context/scenario being tested

Examples:
- `should create store with correct configuration`
- `should handle errors gracefully when operation fails`
- `should update loading state during operations`

### Best Practices
1. **Arrange, Act, Assert**: Structure tests clearly
2. **One assertion per test**: Keep tests focused
3. **Use descriptive variable names**: Make tests readable
4. **Mock at the appropriate level**: Mock external dependencies
5. **Test edge cases**: Include error conditions and boundary cases
6. **Clean up**: Use beforeEach/afterEach for setup/teardown

## Continuous Integration

Tests are configured to run automatically on:
- Push to main/development branches
- Pull requests
- GitHub Actions workflow

## Current Test Quality

The test suite provides:
- **Comprehensive core functionality testing**
- **High code coverage** on business logic
- **Integration testing** of store interactions
- **Edge case handling** verification
- **Configuration validation** testing
- **Fast execution** (~0.8s for all tests)

The library's core functionality is thoroughly tested and reliable without external dependencies.
