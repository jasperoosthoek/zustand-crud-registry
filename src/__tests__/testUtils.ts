import axios, { AxiosInstance } from 'axios';

export interface TestUser {
  id: number;
  name: string;
  email: string;
}

export interface TestPost {
  id: number;
  title: string;
  content: string;
  userId: number;
}

// Simple mock axios without external dependencies
export const createMockAxios = (): { axiosInstance: AxiosInstance; mock: any } => {
  const mockAxios = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    defaults: {},
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  };

  // Mock axios.create to return our mock
  const axiosInstance = mockAxios as any;
  
  const mock = {
    onGet: jest.fn(() => mock),
    onPost: jest.fn(() => mock),
    onPatch: jest.fn(() => mock),
    onPut: jest.fn(() => mock),
    onDelete: jest.fn(() => mock),
    reply: jest.fn(() => mock),
    replyOnce: jest.fn(() => mock),
    reset: jest.fn(),
    restore: jest.fn(),
    history: {
      get: [],
      post: [],
      patch: [],
      put: [],
      delete: []
    }
  };

  return { axiosInstance, mock };
};

export const mockUsers: TestUser[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com' },
];

export const mockPosts: TestPost[] = [
  { id: 1, title: 'First Post', content: 'Content 1', userId: 1 },
  { id: 2, title: 'Second Post', content: 'Content 2', userId: 1 },
  { id: 3, title: 'Third Post', content: 'Content 3', userId: 2 },
];

export const waitForNextUpdate = () => new Promise(resolve => setTimeout(resolve, 0));

export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// React 19 compatible act helper
export const actAsync = async (callback: () => Promise<void> | void) => {
  await callback();
};
