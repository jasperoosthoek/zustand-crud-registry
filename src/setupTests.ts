// Test setup with React Testing Library and jsdom

import '@testing-library/react';

// Mock console to reduce noise during tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock axios for all tests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  })),
}));
