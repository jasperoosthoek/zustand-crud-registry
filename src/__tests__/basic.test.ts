import { createStoreRegistry } from '../createStoreRegistry';
import axios from 'axios';

// Simple unit test without React dependencies
describe('Basic Store Registry', () => {
  interface TestUser {
    id: number;
    name: string;
    email: string;
  }

  it('should create a store registry', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    expect(typeof getOrCreateStore).toBe('function');
  });

  it('should create a store with correct configuration', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    const axiosInstance = axios.create({ baseURL: '/api' });

    const store = getOrCreateStore('users', {
      axios: axiosInstance,
      route: '/users',
      actions: {
        getList: true,
        create: true,
        update: true,
        delete: true,
      },
    });

    expect(store.key).toBe('users');
    expect(store.config).toBeDefined();
    expect(store.config.route).toBe('/users');
    expect(store.config.actions).toBeDefined();
    expect(store.config.actions.getList).toBeDefined();
    expect(store.config.actions.create).toBeDefined();
    expect(store.config.actions.update).toBeDefined();
    expect(store.config.actions.delete).toBeDefined();
  });

  it('should return the same store instance for the same key', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    const axiosInstance = axios.create({ baseURL: '/api' });

    const store1 = getOrCreateStore('users', {
      axios: axiosInstance,
      route: '/users',
      actions: { getList: true },
    });

    const store2 = getOrCreateStore('users', {
      axios: axiosInstance,
      route: '/users',
      actions: { getList: true },
    });

    expect(store1).toBe(store2);
  });

  it('should handle basic store operations', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    const axiosInstance = axios.create({ baseURL: '/api' });

    const store = getOrCreateStore('users', {
      axios: axiosInstance,
      route: '/users',
      actions: { getList: true },
    });

    const state = store.getState();

    // Initial state
    expect(state.record).toBeNull();
    expect(state.count).toBe(0);

    // Set list
    const mockUsers: TestUser[] = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];

    state.setList(mockUsers);
    const newState = store.getState();
    expect(newState.record).toEqual({
      1: mockUsers[0],
      2: mockUsers[1],
    });

    // Set count
    state.setCount(mockUsers.length);
    expect(store.getState().count).toBe(2);
  });

  it('should handle loading states', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    const axiosInstance = axios.create({ baseURL: '/api' });

    const store = getOrCreateStore('users', {
      axios: axiosInstance,
      route: '/users',
      actions: { getList: true },
    });

    const state = store.getState();
    
    expect(state.loadingState).toEqual({});

    // Set loading state
    state.setLoadingState('getList', { isLoading: true, error: null });
    let currentState = store.getState();
    expect(currentState.loadingState.getList).toEqual({
      isLoading: true,
      error: null,
      response: undefined,
      id: undefined,
      sequence: 0, // First time setting, sequence starts at 0
    });
  });
});
