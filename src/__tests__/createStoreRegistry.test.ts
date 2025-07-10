import { createStoreRegistry } from '../createStoreRegistry';
import { TestUser, TestPost, mockUsers } from './testUtils';

// Simple mock axios
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

describe('createStoreRegistry', () => {
  it('should create a store registry function', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
      posts: TestPost;
    }>();

    expect(typeof getOrCreateStore).toBe('function');
  });

  it('should create stores with correct configuration', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    const store = getOrCreateStore('users', {
      axios: mockAxios,
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
  });

  it('should return the same store instance for the same key', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    const store1 = getOrCreateStore('users', {
      axios: mockAxios,
      route: '/users',
      actions: { getList: true },
    });

    const store2 = getOrCreateStore('users', {
      axios: mockAxios,
      route: '/users',
      actions: { getList: true },
    });

    expect(store1).toBe(store2);
  });

  it('should create different stores for different keys', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
      posts: TestPost;
    }>();

    const usersStore = getOrCreateStore('users', {
      axios: mockAxios,
      route: '/users',
      actions: { getList: true },
    });

    const postsStore = getOrCreateStore('posts', {
      axios: mockAxios,
      route: '/posts',
      actions: { getList: true },
    });

    expect(usersStore).not.toBe(postsStore);
    expect(usersStore.key).toBe('users');
    expect(postsStore.key).toBe('posts');
  });

  it('should handle store state operations correctly', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    const store = getOrCreateStore('users', {
      axios: mockAxios,
      route: '/users',
      actions: { getList: true },
    });

    const state = store.getState();

    // Initial state
    expect(state.record).toBeNull();
    expect(state.count).toBe(0);

    // Set list
    state.setList(mockUsers);
    const newState = store.getState();
    expect(newState.record).toEqual({
      1: mockUsers[0],
      2: mockUsers[1],
      3: mockUsers[2],
    });
    expect(newState.count).toBe(0); // count is not automatically set by setList

    // Set count
    state.setCount(mockUsers.length);
    expect(store.getState().count).toBe(3);
  });

  it('should handle instance operations correctly', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    const store = getOrCreateStore('users', {
      axios: mockAxios,
      route: '/users',
      actions: { getList: true },
    });

    const state = store.getState();
    const newUser: TestUser = { id: 4, name: 'New User', email: 'new@example.com' };

    // Set instance (add new)
    state.setInstance(newUser);
    let currentState = store.getState();
    expect(currentState.record).toEqual({ 4: newUser });
    expect(currentState.count).toBe(1);

    // Update instance
    const updatedUser = { ...newUser, name: 'Updated User' };
    state.updateInstance(updatedUser);
    currentState = store.getState();
    expect(currentState.record![4].name).toBe('Updated User');

    // Delete instance
    state.deleteInstance(updatedUser);
    currentState = store.getState();
    expect(currentState.record).toEqual({});
    expect(currentState.count).toBe(0);
  });

  it('should handle patch list correctly', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    const store = getOrCreateStore('users', {
      axios: mockAxios,
      route: '/users',
      actions: { getList: true },
    });

    const state = store.getState();
    
    // Set initial list
    state.setList(mockUsers);
    
    // Patch specific items
    state.patchList([
      { id: 1, name: 'Updated John' },
      { id: 2, email: 'newemail@example.com' },
    ]);

    const currentState = store.getState();
    expect(currentState.record![1].name).toBe('Updated John');
    expect(currentState.record![1].email).toBe('john@example.com'); // unchanged
    expect(currentState.record![2].email).toBe('newemail@example.com');
    expect(currentState.record![2].name).toBe('Jane Smith'); // unchanged
    expect(currentState.record![3]).toEqual(mockUsers[2]); // unchanged
  });

  it('should handle custom state correctly', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    const store = getOrCreateStore('users', {
      axios: mockAxios,
      route: '/users',
      actions: { getList: true },
      state: {
        selectedUserId: null as number | null,
        filterBy: 'all' as string,
      },
    });

    const state = store.getState();
    
    expect(state.state).toEqual({
      selectedUserId: null,
      filterBy: 'all',
    });

    // Update state
    state.setState({ selectedUserId: 1 });
    expect(store.getState().state.selectedUserId).toBe(1);
    expect(store.getState().state.filterBy).toBe('all'); // unchanged

    // Update multiple state fields
    state.setState({ selectedUserId: 2, filterBy: 'active' });
    const currentState = store.getState();
    expect(currentState.state.selectedUserId).toBe(2);
    expect(currentState.state.filterBy).toBe('active');
  });

  it('should handle loading state correctly', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    const store = getOrCreateStore('users', {
      axios: mockAxios,
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
      sequence: 0, // First call, sequence starts at 0
    });

    // Update loading state
    state.setLoadingState('getList', { isLoading: false, response: mockUsers });
    currentState = store.getState();
    expect(currentState.loadingState.getList.isLoading).toBe(false);
    expect(currentState.loadingState.getList.response).toEqual(mockUsers);
    expect(currentState.loadingState.getList.sequence).toBe(1); // After second call
  });
});
