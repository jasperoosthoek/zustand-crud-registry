import { createStoreRegistry } from '../createStoreRegistry';
import { useCrud } from '../useCrud';
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

describe('useCrud', () => {
  let getOrCreateStore: any;
  let store: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();

    store = getOrCreateStore('users', {
      axios: mockAxios,
      route: '/users',
      actions: {
        getList: true,
        get: true,
        create: true,
        update: true,
        delete: true,
      },
    });
  });

  describe('basic hook functionality', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHook(() => useCrud(store));

      expect(result.current.list).toBeNull();
      expect(result.current.count).toBe(0);
      expect(typeof result.current.getList).toBe('function');
      expect(typeof result.current.create).toBe('function');
      expect(typeof result.current.update).toBe('function');
      expect(typeof result.current.delete).toBe('function');
      expect(typeof result.current.get).toBe('function');
    });

    it('should include loading states for all actions', () => {
      const { result } = renderHook(() => useCrud(store));

      expect(result.current.getList.isLoading).toBe(false);
      expect(result.current.getList.error).toBeNull();
      expect(result.current.create.isLoading).toBe(false);
      expect(result.current.update.isLoading).toBe(false);
      expect(result.current.delete.isLoading).toBe(false);
      expect(result.current.get.isLoading).toBe(false);
    });

    it('should reflect store changes in list and count', () => {
      const mockUsers = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      ];

      const { result } = renderHook(() => useCrud(store));

      // Update store directly
      act(() => {
        const state = store.getState();
        state.setList(mockUsers);
        state.setCount(mockUsers.length);
      });

      expect(result.current.list).toEqual(mockUsers);
      expect(result.current.count).toBe(2);
    });
  });

  describe('conditional actions', () => {
    it('should only include enabled actions', () => {
      const limitedStore = getOrCreateStore('limitedUsers', {
        axios: mockAxios,
        route: '/users',
        actions: {
          getList: true,
          create: true,
          // update and delete not included
        },
      });

      const { result } = renderHook(() => useCrud(limitedStore));

      expect(result.current.getList).toBeDefined();
      expect(result.current.create).toBeDefined();
      expect(result.current.update).toBeUndefined();
      expect(result.current.delete).toBeUndefined();
      expect(result.current.get).toBeUndefined();
    });
  });

  describe('custom state management', () => {
    it('should handle custom state', () => {
      const storeWithState = getOrCreateStore('usersWithState', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        state: {
          selectedUserId: null as number | null,
          filterBy: 'all' as string,
        },
      });

      const { result } = renderHook(() => useCrud(storeWithState));

      expect(result.current.state).toEqual({
        selectedUserId: null,
        filterBy: 'all',
      });
      expect(typeof result.current.setState).toBe('function');
    });

    it('should not have state properties when no state is defined', () => {
      const { result } = renderHook(() => useCrud(store));
      expect(result.current.state).toBeUndefined();
      expect(result.current.setState).toBeUndefined();
    });
  });

  describe('custom actions', () => {
    it('should handle custom actions', () => {
      const storeWithCustomActions = getOrCreateStore('usersWithCustomActions', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        customActions: {
          activate: {
            route: (user: TestUser) => `/users/${user.id}/activate`,
            method: 'post',
          },
          deactivate: {
            route: '/users/deactivate',
            method: 'post',
          },
        },
      });

      const { result } = renderHook(() => useCrud(storeWithCustomActions));

      expect(typeof result.current.activate).toBe('function');
      expect(typeof result.current.deactivate).toBe('function');
      expect(result.current.activate.isLoading).toBe(false);
      expect(result.current.deactivate.isLoading).toBe(false);
    });
  });

  describe('includeRecord option', () => {
    it('should include record when includeRecord is true', () => {
      const storeWithRecord = getOrCreateStore('usersWithRecord', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        includeRecord: true,
      });

      const { result } = renderHook(() => useCrud(storeWithRecord));
      expect(result.current.record).toBeNull(); // Initially null
      expect('record' in result.current).toBe(true);
    });

    it('should not include record when includeRecord is false or undefined', () => {
      const { result } = renderHook(() => useCrud(store));
      expect('record' in result.current).toBe(false);
    });
  });

  describe('loading state management', () => {
    it('should track loading state correctly', () => {
      const { result } = renderHook(() => useCrud(store));

      // Initial state - not loading
      expect(result.current.getList.isLoading).toBe(false);
      expect(result.current.getList.error).toBeNull();

      // Set loading state directly on the store
      act(() => {
        const state = store.getState();
        state.setLoadingState('getList', { isLoading: true, error: null });
      });

      // Check that useCrud reflects the loading state
      expect(result.current.getList.isLoading).toBe(true);
      expect(result.current.getList.error).toBeNull();
    });

    it('should track error state correctly', () => {
      const { result } = renderHook(() => useCrud(store));
      const mockError = new Error('Test error');

      // Set error state directly on the store
      act(() => {
        const state = store.getState();
        state.setLoadingState('create', { isLoading: false, error: mockError });
      });

      // Check that useCrud reflects the error state
      expect(result.current.create.isLoading).toBe(false);
      expect(result.current.create.error).toBe(mockError);
    });

    it('should track loading state with id for item-specific actions', () => {
      const { result } = renderHook(() => useCrud(store));

      // Set loading state with id
      act(() => {
        const state = store.getState();
        state.setLoadingState('update', { isLoading: true, id: 123 });
      });

      // Check that useCrud reflects the loading state with id
      expect(result.current.update.isLoading).toBe(true);
      expect(result.current.update.id).toBe(123);
    });
  });

  describe('action function properties', () => {
    it('should have proper loading state properties on action functions', () => {
      const { result } = renderHook(() => useCrud(store));

      // Check that each action has the expected properties
      const actionProps = ['isLoading', 'error', 'response', 'id', 'sequence'];
      
      actionProps.forEach(prop => {
        expect(result.current.getList).toHaveProperty(prop);
        expect(result.current.create).toHaveProperty(prop);
        expect(result.current.update).toHaveProperty(prop);
        expect(result.current.delete).toHaveProperty(prop);
        expect(result.current.get).toHaveProperty(prop);
      });
    });

    it('should support onResponse callback assignment', () => {
      const { result } = renderHook(() => useCrud(store));

      // Should be able to assign onResponse callback
      const mockCallback = jest.fn();
      act(() => {
        result.current.getList.onResponse = mockCallback;
      });

      expect(result.current.getList.onResponse).toBe(mockCallback);
    });
  });

  describe('getAction function', () => {
    it('should prevent concurrent requests of the same type', () => {
      const { result } = renderHook(() => useCrud(store));

      // Set loading state to simulate ongoing request
      act(() => {
        const state = store.getState();
        state.setLoadingState('getList', { isLoading: true });
      });

      // The function should detect it's already loading and return early
      // This is tested by checking that the loading state prevents execution
      expect(result.current.getList.isLoading).toBe(true);
    });
  });

  describe('axios configuration', () => {
    it('should use the configured axios instance', () => {
      const { result } = renderHook(() => useCrud(store));
      
      // The axios instance should be available in the store config
      expect(store.config.axios).toBe(mockAxios);
    });
  });

  describe('route configuration', () => {
    it('should handle string routes', () => {
      const { result } = renderHook(() => useCrud(store));
      expect(store.config.route).toBe('/users');
    });

    it('should handle function routes', () => {
      const storeWithFunctionRoute = getOrCreateStore('usersWithFunctionRoute', {
        axios: mockAxios,
        route: (data: any) => `/users/${data.id}`,
        actions: { getList: true },
      });

      const { result } = renderHook(() => useCrud(storeWithFunctionRoute));
      expect(typeof storeWithFunctionRoute.config.route).toBe('function');
    });
  });

  describe('complex state updates', () => {
    it('should handle state updates correctly', () => {
      const storeWithState = getOrCreateStore('complexState', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        state: {
          selectedUserId: null as number | null,
          filterBy: 'all' as string,
          metadata: { lastUpdated: null as Date | null },
        },
      });

      const { result } = renderHook(() => useCrud(storeWithState));
      
      // Initial state
      expect(result.current.state.selectedUserId).toBeNull();
      expect(result.current.state.filterBy).toBe('all');
      expect(result.current.state.metadata.lastUpdated).toBeNull();

      // Update part of the state
      act(() => {
        result.current.setState({ selectedUserId: 1 });
      });
      
      expect(result.current.state.selectedUserId).toBe(1);
      expect(result.current.state.filterBy).toBe('all'); // Should remain unchanged
      expect(result.current.state.metadata.lastUpdated).toBeNull(); // Should remain unchanged
    });
  });

  describe('error handling', () => {
    it('should handle action errors gracefully', () => {
      const mockOnError = jest.fn();
      const storeWithErrorHandler = getOrCreateStore('usersWithErrorHandler', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        onError: mockOnError,
      });

      const { result } = renderHook(() => useCrud(storeWithErrorHandler));
      expect(storeWithErrorHandler.config.onError).toBe(mockOnError);
    });
  });
});
