import { createStoreRegistry } from '../createStoreRegistry';
import { useCrud, callIfFunc } from '../useCrud';
import { renderHook, act } from '@testing-library/react';

// Simple mock that can be used as axios function
const mockAxios = jest.fn();

interface TestUser {
  id: number;
  name: string;
  email: string;
}

describe('useCrud - Simple Coverage Tests', () => {
  let getOrCreateStore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios.mockClear();
    
    getOrCreateStore = createStoreRegistry<{
      users: TestUser;
    }>();
  });

  describe('callIfFunc utility function', () => {
    it('should call function when provided', () => {
      const mockFn = jest.fn();
      callIfFunc(mockFn, 'arg1', 'arg2');
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should not throw when non-function is provided', () => {
      // These should not throw - covering the else case in callIfFunc
      expect(() => callIfFunc(null)).not.toThrow();
      expect(() => callIfFunc(undefined)).not.toThrow();
      expect(() => callIfFunc('not a function')).not.toThrow();
      expect(() => callIfFunc(123)).not.toThrow();
      expect(() => callIfFunc({})).not.toThrow();
    });
  });

  describe('basic action execution', () => {
    it('should execute a simple getList action', async () => {
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const mockUsers = [{ id: 1, name: 'John', email: 'john@test.com' }];

      mockAxios.mockResolvedValueOnce({
        data: mockUsers
      });

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.getList();
      });

      expect(mockAxios).toHaveBeenCalledWith({
        method: 'get',
        url: '/users',
        params: undefined
      });

      expect(result.current.list).toEqual(mockUsers);
      expect(result.current.count).toBe(1);
    });

    it('should handle action with callback', async () => {
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const mockUsers = [{ id: 1, name: 'John', email: 'john@test.com' }];
      const mockCallback = jest.fn();

      mockAxios.mockResolvedValueOnce({
        data: mockUsers
      });

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.getList({ callback: mockCallback });
      });

      expect(mockCallback).toHaveBeenCalledWith(mockUsers);
    });

    it('should handle action errors', async () => {
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const mockError = new Error('Network error');
      const mockOnError = jest.fn();

      mockAxios.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.getList({ onError: mockOnError });
      });

      expect(mockOnError).toHaveBeenCalledWith(mockError);
      expect(result.current.getList.error).toBe(mockError);
    });

    it('should prevent concurrent requests', async () => {
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useCrud(store));

      // Manually set loading state to simulate ongoing request
      act(() => {
        const state = store.getState();
        state.setLoadingState('getList', { isLoading: true });
      });

      // This should return early and not call axios
      let actionResult;
      await act(async () => {
        actionResult = await result.current.getList();
      });

      expect(actionResult).toBeUndefined();
      expect(mockAxios).not.toHaveBeenCalled();
    });
  });

  describe('action type specific behavior', () => {
    it('should handle get action with setInstance', async () => {
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { get: true },
      });

      const mockUser = { id: 1, name: 'John', email: 'john@test.com' };

      mockAxios.mockResolvedValueOnce({
        data: mockUser
      });

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.get(mockUser);
      });

      expect(result.current.list).toEqual([mockUser]);
    });

    it('should handle create action with setInstance', async () => {
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { create: true },
      });

      const newUser = { name: 'New User', email: 'new@test.com' };
      const createdUser = { id: 1, ...newUser };

      mockAxios.mockResolvedValueOnce({
        data: createdUser
      });

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.create(newUser);
      });

      expect(result.current.list).toEqual([createdUser]);
    });

    it('should handle update action with updateInstance', async () => {
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { update: true },
      });

      // Set initial user
      const existingUser = { id: 1, name: 'Old Name', email: 'old@test.com' };
      act(() => {
        const state = store.getState();
        state.setInstance(existingUser);
      });

      const updatedUser = { id: 1, name: 'Updated Name', email: 'updated@test.com' };

      mockAxios.mockResolvedValueOnce({
        data: updatedUser
      });

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.update(updatedUser);
      });

      expect(result.current.list).toContainEqual(updatedUser);
    });

    it('should handle delete action with deleteInstance', async () => {
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { delete: true },
      });

      const userToDelete = { id: 1, name: 'To Delete', email: 'delete@test.com' };
      
      // Set initial user
      act(() => {
        const state = store.getState();
        state.setInstance(userToDelete);
      });

      mockAxios.mockResolvedValueOnce({
        data: {}
      });

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.delete(userToDelete);
      });

      expect(result.current.list).toEqual([]);
    });
  });

  describe('response data handling', () => {
    it('should handle getList with paginated response structure', async () => {
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const mockUsers = [{ id: 1, name: 'John', email: 'john@test.com' }];

      // Test paginated response format
      mockAxios.mockResolvedValueOnce({
        data: {
          results: mockUsers,
          count: 10
        }
      });

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.getList();
      });

      expect(result.current.list).toEqual(mockUsers);
      expect(result.current.count).toBe(10);
    });

    it('should handle getList with direct array response', async () => {
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const mockUsers = [
        { id: 1, name: 'John', email: 'john@test.com' },
        { id: 2, name: 'Jane', email: 'jane@test.com' }
      ];

      mockAxios.mockResolvedValueOnce({
        data: mockUsers
      });

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.getList();
      });

      expect(result.current.list).toEqual(mockUsers);
      expect(result.current.count).toBe(2);
    });
  });

  describe('callback execution paths', () => {
    it('should execute onResponse callback', async () => {
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const mockUsers = [{ id: 1, name: 'John', email: 'john@test.com' }];
      const onResponseCallback = jest.fn();

      mockAxios.mockResolvedValueOnce({
        data: mockUsers
      });

      const { result } = renderHook(() => useCrud(store));

      // Set onResponse callback
      act(() => {
        result.current.getList.onResponse = onResponseCallback;
      });

      await act(async () => {
        await result.current.getList();
      });

      expect(onResponseCallback).toHaveBeenCalledWith(mockUsers);
    });

    it('should execute action callback from config', async () => {
      const actionCallback = jest.fn();
      
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { 
          getList: {
            callback: actionCallback
          }
        },
      });

      const mockUsers = [{ id: 1, name: 'John', email: 'john@test.com' }];

      mockAxios.mockResolvedValueOnce({
        data: mockUsers
      });

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.getList();
      });

      expect(actionCallback).toHaveBeenCalledWith(mockUsers);
    });
  });

  describe('axios config edge cases', () => {
    it('should handle prepare function in axios config', async () => {
      const prepareFunction = jest.fn((data, options) => ({ ...data, prepared: true }));
      
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: '/users',
        actions: { 
          create: {
            prepare: prepareFunction
          }
        },
      });

      const newUser = { name: 'Test User', email: 'test@test.com' };
      const createdUser = { id: 1, ...newUser, prepared: true };

      mockAxios.mockResolvedValueOnce({
        data: createdUser
      });

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.create(newUser, {
          params: { test: 'param' },
          args: { test: 'arg' }
        });
      });

      expect(prepareFunction).toHaveBeenCalledWith(
        newUser,
        { args: { test: 'arg' }, params: { test: 'param' } }
      );

      expect(mockAxios).toHaveBeenCalledWith({
        method: 'post',
        url: '/users',
        params: { test: 'param' },
        data: { ...newUser, prepared: true }
      });
    });

    it('should handle function route with parameters', async () => {
      const routeFunction = jest.fn((data, options) => `/users/${data.id}/custom`);
      
      const store = getOrCreateStore('users', {
        axios: mockAxios,
        route: routeFunction,
        actions: { get: true },
      });

      const userData = { id: 5, name: 'Test User' };

      mockAxios.mockResolvedValueOnce({
        data: userData
      });

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.get(userData, {
          params: { include: 'profile' },
          args: { source: 'test' }
        });
      });

      expect(routeFunction).toHaveBeenCalledWith(
        userData,
        { args: { source: 'test' }, params: { include: 'profile' } }
      );

      expect(mockAxios).toHaveBeenCalledWith({
        method: 'get',
        url: '/users/5/custom',
        params: { include: 'profile' },
        data: userData
      });
    });
  });
});
