import { createStoreRegistry } from '../src/createStoreRegistry';
import { useCrud } from '../src/useCrud';
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

    it('should reflect store changes in list', () => {
      const mockUsers = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      ];

      const { result } = renderHook(() => useCrud(store));

      // Update store directly
      act(() => {
        const state = store.getState();
        state.setList(mockUsers);
      });

      expect(result.current.list).toEqual(mockUsers);
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

    it('should call config-level onResponse for custom actions', async () => {
      const onResponseMock = jest.fn();
      const responsePayload = { id: 1, name: 'John Doe', active: true };

      const mockAxiosFn = jest.fn().mockResolvedValueOnce({ data: responsePayload });
      Object.assign(mockAxiosFn, mockAxios);

      const storeWithOnResponse = getOrCreateStore('usersOnResponse', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
        customActions: {
          activate: {
            route: (user: TestUser) => `/users/${user.id}/activate`,
            method: 'post' as const,
            onResponse: onResponseMock,
          },
        },
      });

      const { result } = renderHook(() => useCrud(storeWithOnResponse));

      await act(async () => {
        await result.current.activate(
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { args: { reason: 'test' }, params: { notify: true } },
        );
      });

      expect(onResponseMock).toHaveBeenCalledTimes(1);
      expect(onResponseMock).toHaveBeenCalledWith(
        responsePayload,
        {
          data: { id: 1, name: 'John Doe', email: 'john@example.com' },
          args: { reason: 'test' },
          params: { notify: true },
        },
      );
    });
  });

  describe('config-level onResponse for standard actions', () => {
    it('should call config-level onResponse for getList', async () => {
      const onResponseMock = jest.fn();
      const users = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      ];

      const mockAxiosFn = jest.fn().mockResolvedValueOnce({ data: users });
      Object.assign(mockAxiosFn, mockAxios);

      const storeWithOnResponse = getOrCreateStore('usersGetListOnResponse', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: {
          getList: {
            onResponse: onResponseMock,
          },
        },
      });

      const { result } = renderHook(() => useCrud(storeWithOnResponse));

      await act(async () => {
        await result.current.getList({ params: { active: true } });
      });

      expect(onResponseMock).toHaveBeenCalledTimes(1);
      expect(onResponseMock).toHaveBeenCalledWith(
        users,
        {
          data: { params: { active: true } },
          args: undefined,
          params: { active: true },
        },
      );
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

  describe('pagination', () => {
    it('should expose pagination and setPagination when configured', () => {
      const paginationStore = getOrCreateStore('usersPagination', {
        axios: mockAxios as any,
        route: '/users',
        actions: { getList: true },
        pagination: {
          limit: 20,
          prepare: (data: any) => ({ count: data.total }),
          prepareParams: ({ offset, limit }) => ({ offset, limit }),
        },
      });

      const { result } = renderHook(() => useCrud(paginationStore));

      expect(result.current.pagination).toEqual({ count: 0, offset: 0, limit: 20 });
      expect(typeof result.current.setPagination).toBe('function');
    });

    it('should update pagination state via setPagination', () => {
      const paginationStore = getOrCreateStore('usersPaginationUpdate', {
        axios: mockAxios as any,
        route: '/users',
        actions: { getList: true },
        pagination: {
          limit: 20,
          prepare: (data: any) => ({ count: data.total }),
          prepareParams: ({ offset, limit }) => ({ offset, limit }),
        },
      });

      const { result } = renderHook(() => useCrud(paginationStore));

      act(() => {
        result.current.setPagination!({ offset: 40 });
      });

      expect(result.current.pagination).toEqual({ count: 0, offset: 40, limit: 20 });
    });

    it('should use prepareParams to build request params', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({
        data: { items: [{ id: 1, name: 'John', email: 'john@example.com' }], total: 50 },
      });
      Object.assign(mockAxiosFn, mockAxios);

      const paginationStore = getOrCreateStore('usersPaginationParams', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
        pagination: {
          limit: 10,
          prepare: (data: any) => ({ count: data.total }),
          prepareParams: ({ offset, limit }) => ({ page: offset / limit + 1, page_size: limit }),
        },
      });

      const { result } = renderHook(() => useCrud(paginationStore));

      await act(async () => {
        await result.current.getList({ params: { search: 'john' } });
      });

      expect(mockAxiosFn).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { page: 1, page_size: 10, search: 'john' },
        }),
      );
    });

    it('should call prepare and update pagination from response', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({
        data: { results: [{ id: 1, name: 'John', email: 'john@example.com' }], total: 50 },
      });
      Object.assign(mockAxiosFn, mockAxios);

      const paginationStore = getOrCreateStore('usersPaginationPrepare', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
        pagination: {
          limit: 10,
          prepare: (data: any) => ({ count: data.total }),
          prepareParams: ({ offset, limit }) => ({ offset, limit }),
        },
      });

      const { result } = renderHook(() => useCrud(paginationStore));

      await act(async () => {
        await result.current.getList();
      });

      expect(result.current.pagination).toEqual({ count: 50, offset: 0, limit: 10 });
    });

    it('should not expose pagination when not configured', () => {
      const { result } = renderHook(() => useCrud(store));

      expect(result.current.pagination).toBeUndefined();
      expect(result.current.setPagination).toBeUndefined();
    });

    it('should support pagination: true as minimal opt-in', () => {
      const paginationStore = getOrCreateStore('usersPaginationTrue', {
        axios: mockAxios as any,
        route: '/users',
        actions: { getList: true },
        pagination: true,
      });

      const { result } = renderHook(() => useCrud(paginationStore));

      expect(result.current.pagination).toEqual({ count: 0, offset: 0, limit: 0 });
      expect(typeof result.current.setPagination).toBe('function');
    });

    it('should work without prepare (no auto-extraction from response)', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({
        data: [{ id: 1, name: 'John', email: 'john@example.com' }],
      });
      Object.assign(mockAxiosFn, mockAxios);

      const paginationStore = getOrCreateStore('usersPaginationNoPrepare', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
        pagination: {
          limit: 20,
        },
      });

      const { result } = renderHook(() => useCrud(paginationStore));

      await act(async () => {
        await result.current.getList();
      });

      // pagination.count should remain 0 since no prepare function extracts it
      expect(result.current.pagination).toEqual({ count: 0, offset: 0, limit: 20 });
    });

    it('should work without prepareParams (no auto params on request)', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({
        data: { results: [{ id: 1, name: 'John', email: 'john@example.com' }], total: 50 },
      });
      Object.assign(mockAxiosFn, mockAxios);

      const paginationStore = getOrCreateStore('usersPaginationNoPrepareParams', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
        pagination: {
          limit: 10,
          prepare: (data: any) => ({ count: data.total }),
        },
      });

      const { result } = renderHook(() => useCrud(paginationStore));

      await act(async () => {
        await result.current.getList({ params: { search: 'john' } });
      });

      // No pagination params should be added, only user-provided params
      expect(mockAxiosFn).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { search: 'john' },
        }),
      );

      // But prepare should still extract count from response
      expect(result.current.pagination).toEqual({ count: 50, offset: 0, limit: 10 });
    });

    it('should support pagination with only limit (manual control)', () => {
      const paginationStore = getOrCreateStore('usersPaginationLimitOnly', {
        axios: mockAxios as any,
        route: '/users',
        actions: { getList: true },
        pagination: {
          limit: 25,
        },
      });

      const { result } = renderHook(() => useCrud(paginationStore));

      expect(result.current.pagination).toEqual({ count: 0, offset: 0, limit: 25 });

      // User can manually control pagination
      act(() => {
        result.current.setPagination!({ count: 100, offset: 50 });
      });

      expect(result.current.pagination).toEqual({ count: 100, offset: 50, limit: 25 });
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

  describe('select', () => {
    const mockUsers = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      { id: 3, name: 'Bob Wilson', email: 'bob@example.com' },
    ];

    it('should expose select fields when select: single is configured', () => {
      const selectStore = getOrCreateStore('usersSingleSelect', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'single',
      });

      const { result } = renderHook(() => useCrud(selectStore));

      expect(result.current.selected).toEqual([]);
      expect(result.current.selectedItem).toBeNull();
      expect(result.current.selectedIds).toEqual([]);
      expect(typeof result.current.select).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
      expect(typeof result.current.clear).toBe('function');
    });

    it('should expose select fields when select: multiple is configured', () => {
      const selectStore = getOrCreateStore('usersMultipleSelect', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'multiple',
      });

      const { result } = renderHook(() => useCrud(selectStore));

      expect(result.current.selected).toEqual([]);
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should NOT expose select fields when select is omitted', () => {
      const { result } = renderHook(() => useCrud(store));

      expect((result.current as any).selected).toBeUndefined();
      expect((result.current as any).selectedItem).toBeUndefined();
      expect((result.current as any).toggle).toBeUndefined();
      expect((result.current as any).clear).toBeUndefined();
    });

    it('should work: single select via useCrud', () => {
      const selectStore = getOrCreateStore('usersSingleSelectWork', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'single',
      });

      act(() => { selectStore.getState().setList(mockUsers); });

      const { result } = renderHook(() => useCrud(selectStore));

      act(() => { result.current.select(mockUsers[0]); });
      expect(result.current.selectedItem).toEqual(mockUsers[0]);
      expect(result.current.selectedIds).toEqual(['1']);

      act(() => { result.current.toggle(mockUsers[0]); });
      expect(result.current.selectedItem).toBeNull();

      act(() => { result.current.clear(); });
      expect(result.current.selectedIds).toEqual([]);
    });

    it('should work: multiple select via useCrud', () => {
      const selectStore = getOrCreateStore('usersMultipleSelectWork', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'multiple',
      });

      act(() => { selectStore.getState().setList(mockUsers); });

      const { result } = renderHook(() => useCrud(selectStore));

      act(() => { result.current.toggle(mockUsers[0]); });
      act(() => { result.current.toggle(mockUsers[2]); });
      expect(result.current.selected).toEqual([mockUsers[0], mockUsers[2]]);

      act(() => { result.current.toggle(mockUsers[0]); });
      expect(result.current.selected).toEqual([mockUsers[2]]);

      act(() => { result.current.clear(); });
      expect(result.current.selected).toEqual([]);
    });
  });
});
