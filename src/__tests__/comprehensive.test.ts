import { createStoreRegistry } from '../createStoreRegistry';
import { validateConfig } from '../config';
import { defaultLoadingState, getLoadingState, setLoadingState } from '../loadingState';

// Mock axios for testing
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => mockAxios),
};

// Test types
interface TestUser {
  id: number;
  name: string;
  email: string;
  active?: boolean;
}

interface TestPost {
  id: number;
  title: string;
  content: string;
  userId: number;
}

// Mock data
const mockUsers: TestUser[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', active: true },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', active: true },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', active: false },
];

describe('Zustand CRUD Registry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Store Registry Creation', () => {
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
  });

  describe('Store State Management', () => {
    let store: any;

    beforeEach(() => {
      const getOrCreateStore = createStoreRegistry<{
        users: TestUser;
      }>();

      store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });
    });

    it('should handle initial state correctly', () => {
      const state = store.getState();
      expect(state.record).toBeNull();
      expect(state.count).toBe(0);
      expect(state.loadingState).toEqual({});
    });

    it('should set list correctly', () => {
      const state = store.getState();
      state.setList(mockUsers);
      
      const newState = store.getState();
      expect(newState.record).toEqual({
        1: mockUsers[0],
        2: mockUsers[1],
        3: mockUsers[2],
      });
    });

    it('should set count correctly', () => {
      const state = store.getState();
      state.setCount(5);
      
      expect(store.getState().count).toBe(5);
    });

    it('should add instances correctly', () => {
      const state = store.getState();
      const newUser: TestUser = { id: 4, name: 'New User', email: 'new@example.com' };
      
      state.setInstance(newUser);
      
      const newState = store.getState();
      expect(newState.record).toEqual({ 4: newUser });
      expect(newState.count).toBe(1);
    });

    it('should update instances correctly', () => {
      const state = store.getState();
      
      // First add a user
      state.setList(mockUsers);
      
      // Then update it
      const updatedUser = { id: 1, name: 'Updated John', email: 'john@example.com' };
      state.updateInstance(updatedUser);
      
      const newState = store.getState();
      expect(newState.record![1].name).toBe('Updated John');
      expect(newState.record![1].email).toBe('john@example.com');
    });

    it('should delete instances correctly', () => {
      const state = store.getState();
      
      // First add users
      state.setList(mockUsers);
      state.setCount(mockUsers.length);
      
      // Then delete one
      state.deleteInstance(mockUsers[0]);
      
      const newState = store.getState();
      expect(newState.record![1]).toBeUndefined();
      expect(newState.count).toBe(2);
    });

    it('should patch list correctly', () => {
      const state = store.getState();
      
      // Set initial list
      state.setList(mockUsers);
      
      // Patch specific items
      state.patchList([
        { id: 1, name: 'Updated John' },
        { id: 2, email: 'newemail@example.com' },
      ]);

      const newState = store.getState();
      expect(newState.record![1].name).toBe('Updated John');
      expect(newState.record![1].email).toBe('john@example.com'); // unchanged
      expect(newState.record![2].email).toBe('newemail@example.com');
      expect(newState.record![2].name).toBe('Jane Smith'); // unchanged
    });
  });

  describe('Custom State Management', () => {
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
  });

  describe('Loading State Management', () => {
    let store: any;

    beforeEach(() => {
      const getOrCreateStore = createStoreRegistry<{
        users: TestUser;
      }>();

      store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });
    });

    it('should have correct default loading state', () => {
      expect(defaultLoadingState).toEqual({
        isLoading: false,
        error: null,
        response: undefined,
        id: undefined,
        sequence: 0,
      });
    });

    it('should get loading state correctly', () => {
      const loadingState = getLoadingState(store, 'nonexistent');
      expect(loadingState).toEqual(defaultLoadingState);
    });

    it('should set loading state correctly', () => {
      setLoadingState(store, 'getList', { 
        isLoading: true, 
        error: null, 
        id: 123 
      });

      const state = store.getState();
      expect(state.loadingState.getList).toEqual({
        isLoading: true,
        error: null,
        response: undefined,
        id: 123,
        sequence: 0, // First time setting, sequence starts at 0
      });
    });

    it('should increment sequence on subsequent calls', () => {
      setLoadingState(store, 'getList', { isLoading: true });
      setLoadingState(store, 'getList', { isLoading: false });

      const state = store.getState();
      expect(state.loadingState.getList.sequence).toBe(1); // After second call, sequence is 1
    });
  });

  describe('Configuration Validation', () => {
    it('should validate basic config with default values', () => {
      const config = {
        axios: mockAxios,
        route: '/users',
      };

      const validated = validateConfig<'users', TestUser, typeof config>(config);

      expect(validated.id).toBe('id');
      expect(validated.byKey).toBe('id');
      expect(validated.parseIdToInt).toBe(false);
      expect(validated.state).toEqual({});
      expect(validated.axios).toBe(mockAxios);
      expect(validated.onError).toBeNull();
      expect(validated.includeRecord).toBe(false);
      expect(validated.route).toBe('/users');
      expect(validated.customActions).toEqual({});
    });

    it('should validate config with custom values', () => {
      const mockOnError = jest.fn();
      const config = {
        axios: mockAxios,
        route: '/users',
        id: 'userId',
        byKey: 'userId',
        parseIdToInt: true,
        state: { selectedId: null },
        onError: mockOnError,
        includeRecord: true,
      };

      const validated = validateConfig<'users', TestUser, typeof config>(config);

      expect(validated.id).toBe('userId');
      expect(validated.byKey).toBe('userId');
      expect(validated.parseIdToInt).toBe(true);
      expect(validated.state).toEqual({ selectedId: null });
      expect(validated.onError).toBe(mockOnError);
      expect(validated.includeRecord).toBe(true);
    });

    it('should validate actions configuration', () => {
      const config = {
        axios: mockAxios,
        route: '/users',
        actions: {
          getList: true,
          create: true,
          update: { method: 'put' as const },
          delete: { route: '/users/delete' },
        },
      };

      const validated = validateConfig<'users', TestUser, typeof config>(config);

      expect(validated.actions.getList).toEqual({
        method: 'get',
        prepare: null,
        callback: null,
        onError: null,
        prepareResponse: null,
        route: '/users',
      });

      expect(validated.actions.create).toEqual({
        method: 'post',
        prepare: null,
        callback: null,
        onError: null,
        prepareResponse: null,
        route: '/users',
      });

      expect(validated.actions.update).toEqual({
        method: 'put',
        prepare: null,
        callback: null,
        onError: null,
        prepareResponse: null,
        route: expect.any(Function),
      });
    });

    it('should validate custom actions', () => {
      const config = {
        axios: mockAxios,
        route: '/users',
        customActions: {
          activate: {
            route: '/users/activate',
            method: 'post' as const,
          },
          deactivate: {
            route: (user: TestUser) => `/users/${user.id}/deactivate`,
            method: 'delete' as const,
          },
        },
      };

      const validated = validateConfig<'users', TestUser, typeof config>(config);

      expect(validated.customActions.activate).toEqual({
        route: '/users/activate',
        method: 'post',
        onError: null,
      });

      expect(validated.customActions.deactivate).toEqual({
        route: expect.any(Function),
        method: 'delete',
        onError: null,
      });
    });
  });

  describe('Multiple Store Registry', () => {
    it('should handle multiple independent stores', () => {
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

      // Set different data in each store
      const usersState = usersStore.getState();
      const postsState = postsStore.getState();

      usersState.setList(mockUsers);
      postsState.setList([{ id: 1, title: 'Post 1', content: 'Content 1', userId: 1 }]);

      // Verify stores are independent
      expect(usersStore.getState().record).not.toBe(postsStore.getState().record);
      expect(Object.keys(usersStore.getState().record || {}).length).toBe(3);
      expect(Object.keys(postsStore.getState().record || {}).length).toBe(1);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle null/undefined data gracefully', () => {
      const getOrCreateStore = createStoreRegistry<{
        users: TestUser;
      }>();

      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const state = store.getState();

      // These should not throw errors
      expect(() => state.patchList([])).not.toThrow();
      expect(() => state.updateInstance({ id: 999, name: 'Test' })).not.toThrow();
      expect(() => state.deleteInstance({ id: 999, name: 'Test', email: 'test@test.com' })).not.toThrow();
    });
  });
});
