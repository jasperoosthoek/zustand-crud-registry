import { createStoreRegistry } from '../createStoreRegistry';
import { useStore } from '../useStore';
import { renderHook, act } from '@testing-library/react';

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

interface TestUser {
  id: number;
  name: string;
  email: string;
}

describe('useStore', () => {
  let getOrCreateStore: any;
  let store: any;

  beforeEach(() => {
    getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    store = getOrCreateStore('users', {
      axios: mockAxios,
      route: '/users',
      actions: {
        getList: true,
        create: true,
        update: true,
        delete: true,
      },
      state: {
        selectedUserId: null as number | null,
        filterBy: 'all' as string,
      },
    });
  });

  it('should return complete store state', () => {
    const { result } = renderHook(() => useStore(store));

    expect(result.current.record).toBeNull();
    expect(result.current.count).toBe(0);
    expect(result.current.loadingState).toEqual({});
    expect(result.current.state).toEqual({
      selectedUserId: null,
      filterBy: 'all',
    });
    expect(typeof result.current.setList).toBe('function');
    expect(typeof result.current.patchList).toBe('function');
    expect(typeof result.current.setCount).toBe('function');
    expect(typeof result.current.setInstance).toBe('function');
    expect(typeof result.current.updateInstance).toBe('function');
    expect(typeof result.current.deleteInstance).toBe('function');
    expect(typeof result.current.setLoadingState).toBe('function');
    expect(typeof result.current.setState).toBe('function');
  });

  it('should reflect store changes', () => {
    const mockUsers = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];

    const { result } = renderHook(() => useStore(store));

    // Get initial state
    expect(result.current.record).toBeNull();
    expect(result.current.count).toBe(0);

    // Update store directly
    act(() => {
      const state = store.getState();
      state.setList(mockUsers);
      state.setCount(mockUsers.length);
    });

    // Check that useStore reflects the changes
    expect(result.current.record).toEqual({
      1: mockUsers[0],
      2: mockUsers[1],
    });
    expect(result.current.count).toBe(2);
  });

  it('should provide access to store functions', () => {
    const { result } = renderHook(() => useStore(store));
    const newUser = { id: 3, name: 'New User', email: 'new@example.com' };

    // Test setInstance
    act(() => {
      result.current.setInstance(newUser);
    });
    expect(result.current.record).toEqual({ 3: newUser });
    expect(result.current.count).toBe(1);

    // Test updateInstance
    act(() => {
      result.current.updateInstance({ id: 3, name: 'Updated User' });
    });
    expect(result.current.record![3].name).toBe('Updated User');
    expect(result.current.record![3].email).toBe('new@example.com');

    // Test deleteInstance
    act(() => {
      result.current.deleteInstance(newUser);
    });
    expect(result.current.record).toEqual({});
    expect(result.current.count).toBe(0);
  });

  it('should provide access to custom state', () => {
    const { result } = renderHook(() => useStore(store));

    // Test initial state
    expect(result.current.state.selectedUserId).toBeNull();
    expect(result.current.state.filterBy).toBe('all');

    // Test setState
    act(() => {
      result.current.setState({ selectedUserId: 1 });
    });
    expect(result.current.state.selectedUserId).toBe(1);
    expect(result.current.state.filterBy).toBe('all');

    // Test setting multiple state values
    act(() => {
      result.current.setState({ selectedUserId: 2, filterBy: 'active' });
    });
    expect(result.current.state.selectedUserId).toBe(2);
    expect(result.current.state.filterBy).toBe('active');
  });

  it('should provide access to loading state functions', () => {
    const { result } = renderHook(() => useStore(store));

    // Test setLoadingState
    act(() => {
      result.current.setLoadingState('customAction', {
        isLoading: true,
        error: null,
        id: 123,
      });
    });

    expect(result.current.loadingState.customAction).toEqual({
      isLoading: true,
      error: null,
      response: undefined,
      id: 123,
      sequence: 0,
    });
  });

  it('should handle patchList correctly', () => {
    const mockUsers = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];

    const { result } = renderHook(() => useStore(store));
    
    // Set initial list
    act(() => {
      result.current.setList(mockUsers);
    });
    
    // Patch specific items
    act(() => {
      result.current.patchList([
        { id: 1, name: 'Updated John' },
        { id: 2, email: 'updated@example.com' },
      ]);
    });

    expect(result.current.record![1].name).toBe('Updated John');
    expect(result.current.record![1].email).toBe('john@example.com');
    expect(result.current.record![2].email).toBe('updated@example.com');
    expect(result.current.record![2].name).toBe('Jane Smith');
  });

  it('should work with stores without custom state', () => {
    const storeWithoutState = getOrCreateStore('usersWithoutState', {
      axios: mockAxios,
      route: '/users',
      actions: { getList: true },
    });

    const { result } = renderHook(() => useStore(storeWithoutState));
    expect(result.current.state).toBeUndefined();
    expect(typeof result.current.setList).toBe('function');
    expect(typeof result.current.setCount).toBe('function');
  });

  it('should handle record operations correctly', () => {
    const { result } = renderHook(() => useStore(store));
    const user1 = { id: 1, name: 'User 1', email: 'user1@example.com' };
    const user2 = { id: 2, name: 'User 2', email: 'user2@example.com' };

    // Set multiple instances
    act(() => {
      result.current.setInstance(user1);
      result.current.setInstance(user2);
    });

    expect(result.current.record).toEqual({
      1: user1,
      2: user2,
    });
    expect(result.current.count).toBe(2);

    // Update one instance
    act(() => {
      result.current.updateInstance({ id: 1, name: 'Updated User 1' });
    });
    expect(result.current.record![1].name).toBe('Updated User 1');
    expect(result.current.record![1].email).toBe('user1@example.com');

    // Delete one instance
    act(() => {
      result.current.deleteInstance(user2);
    });
    expect(result.current.record).toEqual({ 1: { id: 1, name: 'Updated User 1', email: 'user1@example.com' } });
    expect(result.current.count).toBe(1);
  });
});
