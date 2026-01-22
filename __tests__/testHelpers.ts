import { act } from '@testing-library/react';

// Mock implementation for testing loading states
export const createMockAxiosWithDelay = (delay: number = 100) => {
  const mockAxios = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const createDelayedResponse = (response: any, status: number = 200) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: response, status });
      }, delay);
    });
  };

  mockAxios.get.mockImplementation(() => createDelayedResponse([]));
  mockAxios.post.mockImplementation(() => createDelayedResponse({}));
  mockAxios.patch.mockImplementation(() => createDelayedResponse({}));
  mockAxios.put.mockImplementation(() => createDelayedResponse({}));
  mockAxios.delete.mockImplementation(() => createDelayedResponse({}));

  return mockAxios;
};

// Helper to wait for async operations
export const waitFor = (condition: () => boolean, timeout: number = 5000) => {
  return new Promise<void>((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 10);
      }
    };
    
    check();
  });
};

// Helper to simulate user actions with proper act() wrapping
export const simulateUserAction = async (action: () => Promise<void> | void) => {
  await act(async () => {
    await action();
  });
};

// Mock error creator
export const createMockError = (message: string, status: number = 400) => {
  const error = new Error(message);
  (error as any).response = {
    status,
    data: { message },
  };
  return error;
};

// Advanced test user with more fields for complex testing
export interface ExtendedTestUser extends TestUser {
  active?: boolean;
  role?: string;
  lastLogin?: string;
  metadata?: Record<string, any>;
}

export const extendedMockUsers: ExtendedTestUser[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    active: true,
    role: 'admin',
    lastLogin: '2023-01-01T00:00:00Z',
    metadata: { department: 'IT' },
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@example.com',
    active: true,
    role: 'user',
    lastLogin: '2023-01-02T00:00:00Z',
    metadata: { department: 'HR' },
  },
  {
    id: 3,
    name: 'Bob Johnson',
    email: 'bob@example.com',
    active: false,
    role: 'user',
    lastLogin: '2022-12-15T00:00:00Z',
    metadata: { department: 'Sales' },
  },
];

// Helper to create realistic paginated responses
export const createPaginatedResponse = (
  data: any[],
  page: number = 1,
  pageSize: number = 10,
  totalCount?: number
) => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);
  const total = totalCount || data.length;
  
  return {
    results: paginatedData,
    count: total,
    next: endIndex < total ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
  };
};

// Console spy utilities for testing error handling
export const mockConsole = () => {
  const originalConsole = global.console;
  const mockConsole = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  };
  
  global.console = mockConsole as any;
  
  return {
    mockConsole,
    restore: () => {
      global.console = originalConsole;
    },
  };
};
