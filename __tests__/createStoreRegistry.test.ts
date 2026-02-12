import { createStoreRegistry } from '../src/createStoreRegistry';
import { TestUser, TestPost, mockUsers } from './testUtils';

/** Convert Map-based store data to a plain record for assertions. */
const toRecord = (store: any) => {
  const d = store.getState().data;
  return d ? Object.fromEntries(d) : null;
};

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
    expect(state.data).toBeNull();

    // Set list
    state.setList(mockUsers);
    expect(toRecord(store)).toEqual({
      '1': mockUsers[0],
      '2': mockUsers[1],
      '3': mockUsers[2],
    });
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
    expect(toRecord(store)).toEqual({ '4': newUser });

    // Update instance
    const updatedUser = { ...newUser, name: 'Updated User' };
    state.updateInstance(updatedUser);
    expect(store.getState().data!.get('4')!.name).toBe('Updated User');

    // Delete instance
    state.deleteInstance(updatedUser);
    expect(toRecord(store)).toEqual({});
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

    const data = store.getState().data!;
    expect(data.get('1')!.name).toBe('Updated John');
    expect(data.get('1')!.email).toBe('john@example.com'); // unchanged
    expect(data.get('2')!.email).toBe('newemail@example.com');
    expect(data.get('2')!.name).toBe('Jane Smith'); // unchanged
    expect(data.get('3')).toEqual(mockUsers[2]); // unchanged
  });

  it('should handle update list correctly (upsert)', () => {
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

    // Update list with mix of existing and new users
    const updatedUser1: TestUser = { id: 1, name: 'John Updated', email: 'john.updated@example.com' };
    const newUser4: TestUser = { id: 4, name: 'New User 4', email: 'user4@example.com' };
    const newUser5: TestUser = { id: 5, name: 'New User 5', email: 'user5@example.com' };

    state.updateList([updatedUser1, newUser4, newUser5]);

    const data = store.getState().data!;

    // Existing user should be replaced completely
    expect(data.get('1')).toEqual(updatedUser1);

    // Existing users not in updateList should remain unchanged
    expect(data.get('2')).toEqual(mockUsers[1]);
    expect(data.get('3')).toEqual(mockUsers[2]);

    // New users should be added
    expect(data.get('4')).toEqual(newUser4);
    expect(data.get('5')).toEqual(newUser5);
  });

  it('should handle update list with empty initial state', () => {
    const getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    const store = getOrCreateStore('users', {
      axios: mockAxios,
      route: '/users',
      actions: { getList: true },
    });

    const state = store.getState();

    // Call updateList on empty store
    const newUser1: TestUser = { id: 1, name: 'User 1', email: 'user1@example.com' };
    const newUser2: TestUser = { id: 2, name: 'User 2', email: 'user2@example.com' };

    state.updateList([newUser1, newUser2]);

    expect(store.getState().data!.get('1')).toEqual(newUser1);
    expect(store.getState().data!.get('2')).toEqual(newUser2);
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
