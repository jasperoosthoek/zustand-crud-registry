import { createStoreRegistry } from '../src/createStoreRegistry';
import { useList } from '../src/useList';
import { useRecord } from '../src/useRecord';
import { useActions } from '../src/useActions';
import { usePagination } from '../src/usePagination';
import { useCrudState } from '../src/useCrudState';
import { useSelect } from '../src/useSelect';
import { useGet } from '../src/useGet';
import { useGetList } from '../src/useGetList';
import { useCrud } from '../src/useCrud';
import { renderHook, act } from '@testing-library/react';

/** Convert Map-based store data to a plain record for assertions. */
const toRecord = (store: any) => {
  const d = store.getState().data;
  return d ? Object.fromEntries(d) : null;
};

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

const mockUsers: TestUser[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  { id: 3, name: 'Bob Wilson', email: 'bob@example.com' },
];

describe('granular hooks', () => {
  let getOrCreateStore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    getOrCreateStore = createStoreRegistry<{ users: TestUser }>();
  });

  describe('useList', () => {
    it('should return null when no data is loaded', () => {
      const store = getOrCreateStore('users-list-null', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useList(store));
      expect(result.current).toBeNull();
    });

    it('should return list when data is loaded', () => {
      const store = getOrCreateStore('users-list-data', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useList(store));
      expect(result.current).toEqual(mockUsers);
    });

    it('should update when record changes', () => {
      const store = getOrCreateStore('users-list-update', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useList(store));
      expect(result.current).toBeNull();

      act(() => { store.getState().setList(mockUsers); });
      expect(result.current).toHaveLength(3);

      act(() => { store.getState().setInstance({ id: 4, name: 'New User', email: 'new@example.com' }); });
      expect(result.current).toHaveLength(4);

      act(() => { store.getState().deleteInstance({ id: 1 }); });
      expect(result.current).toHaveLength(3);
    });

    it('should return null after setList(null)', () => {
      const store = getOrCreateStore('users-list-clear', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useList(store));
      expect(result.current).toHaveLength(3);

      act(() => { store.getState().setList(null); });
      expect(result.current).toBeNull();
    });
  });

  describe('useRecord', () => {
    it('should return null when no data is loaded', () => {
      const store = getOrCreateStore('users-record-null', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useRecord(store));
      expect(result.current).toBeNull();
    });

    it('should return keyed record when data is loaded', () => {
      const store = getOrCreateStore('users-record-data', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useRecord(store));
      expect(result.current).toEqual({
        '1': mockUsers[0],
        '2': mockUsers[1],
        '3': mockUsers[2],
      });
    });

    it('should update when instances change', () => {
      const store = getOrCreateStore('users-record-update', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useRecord(store));
      expect(result.current).toBeNull();

      act(() => { store.getState().setList(mockUsers); });
      expect(Object.keys(result.current!)).toHaveLength(3);

      act(() => { store.getState().updateInstance({ id: 1, name: 'Updated John', email: 'john@example.com' }); });
      expect(result.current!['1'].name).toBe('Updated John');
    });

    it('should return null after setList(null)', () => {
      const store = getOrCreateStore('users-record-clear', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useRecord(store));
      expect(result.current).not.toBeNull();

      act(() => { store.getState().setList(null); });
      expect(result.current).toBeNull();
    });
  });


  describe('useActions', () => {
    it('should return action functions based on config', () => {
      const store = getOrCreateStore('users-actions-basic', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true, create: true, update: true, delete: true, get: true },
      });

      const { result } = renderHook(() => useActions(store));

      expect(typeof result.current.getList).toBe('function');
      expect(typeof result.current.create).toBe('function');
      expect(typeof result.current.update).toBe('function');
      expect(typeof result.current.delete).toBe('function');
      expect(typeof result.current.get).toBe('function');
    });

    it('should only include enabled actions', () => {
      const store = getOrCreateStore('users-actions-limited', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useActions(store));

      expect(typeof result.current.getList).toBe('function');
      expect((result.current as any).create).toBeUndefined();
      expect((result.current as any).update).toBeUndefined();
      expect((result.current as any).delete).toBeUndefined();
    });

    it('should have loading state properties on actions', () => {
      const store = getOrCreateStore('users-actions-loading', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useActions(store));

      expect(result.current.getList.isLoading).toBe(false);
      expect(result.current.getList.error).toBeNull();
    });

    it('should reflect loading state changes', () => {
      const store = getOrCreateStore('users-actions-loading-change', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useActions(store));

      act(() => {
        store.getState().setLoadingState('getList', { isLoading: true, error: null });
      });

      expect(result.current.getList.isLoading).toBe(true);
    });

    it('should include custom actions', () => {
      const store = getOrCreateStore('users-actions-custom', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        customActions: {
          activate: { route: '/users/activate', method: 'post' as const },
          deactivate: { route: '/users/deactivate', method: 'post' as const },
        },
      });

      const { result } = renderHook(() => useActions(store));

      expect(typeof result.current.activate).toBe('function');
      expect(typeof result.current.deactivate).toBe('function');
      expect(result.current.activate.isLoading).toBe(false);
    });

    it('should execute getList and populate the store', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({ data: mockUsers });
      Object.assign(mockAxiosFn, mockAxios);

      const store = getOrCreateStore('users-actions-execute', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useActions(store));

      await act(async () => {
        await result.current.getList();
      });

      expect(toRecord(store)).toEqual({
        '1': mockUsers[0],
        '2': mockUsers[1],
        '3': mockUsers[2],
      });
    });
  });

  describe('usePagination', () => {
    it('should return pagination state and setter', () => {
      const store = getOrCreateStore('users-pagination-basic', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        pagination: { limit: 20 },
      });

      const { result } = renderHook(() => usePagination(store));

      expect(result.current.pagination).toEqual({ count: 0, offset: 0, limit: 20 });
      expect(typeof result.current.setPagination).toBe('function');
    });

    it('should update pagination via setPagination', () => {
      const store = getOrCreateStore('users-pagination-update', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        pagination: { limit: 10 },
      });

      const { result } = renderHook(() => usePagination(store));

      act(() => { result.current.setPagination({ offset: 20, count: 100 }); });

      expect(result.current.pagination).toEqual({ count: 100, offset: 20, limit: 10 });
    });

    it('should return null pagination when not configured', () => {
      const store = getOrCreateStore('users-pagination-none', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => usePagination(store));
      expect(result.current.pagination).toBeNull();
    });
  });

  describe('useCrudState', () => {
    it('should return custom state and setter', () => {
      const store = getOrCreateStore('users-state-basic', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        state: { filter: 'all', count: 0 },
      });

      const { result } = renderHook(() => useCrudState(store));

      expect(result.current.state).toEqual({ filter: 'all', count: 0 });
      expect(typeof result.current.setState).toBe('function');
    });

    it('should update state via setState', () => {
      const store = getOrCreateStore('users-state-update', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        state: { filter: 'all', count: 0 },
      });

      const { result } = renderHook(() => useCrudState(store));

      act(() => { result.current.setState({ filter: 'active' }); });

      expect(result.current.state.filter).toBe('active');
      expect(result.current.state.count).toBe(0); // unchanged
    });

    it('should handle multiple updates', () => {
      const store = getOrCreateStore('users-state-multi', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        state: { a: 1, b: 2, c: 3 },
      });

      const { result } = renderHook(() => useCrudState(store));

      act(() => { result.current.setState({ a: 10 }); });
      act(() => { result.current.setState({ b: 20 }); });

      expect(result.current.state).toEqual({ a: 10, b: 20, c: 3 });
    });
  });

  describe('setList(null)', () => {
    it('should reset record to null', () => {
      const store = getOrCreateStore('users-setlist-null', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      store.getState().setList(mockUsers);
      expect(store.getState().data).not.toBeNull();

      store.getState().setList(null);
      expect(store.getState().data).toBeNull();
    });

    it('should reset from populated to null and back', () => {
      const store = getOrCreateStore('users-setlist-null-cycle', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      store.getState().setList(mockUsers);
      expect(store.getState().data!.size).toBe(3);

      store.getState().setList(null);
      expect(store.getState().data).toBeNull();

      store.getState().setList([mockUsers[0]]);
      expect(store.getState().data!.size).toBe(1);
    });
  });

  describe('setList clears selectedIds', () => {
    it('should clear selectedIds when setList is called with data', () => {
      const store = getOrCreateStore('users-setlist-clears-select', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'single',
      });

      store.getState().setList(mockUsers);
      store.getState().setSelectedIds(['1', '2']);
      expect(store.getState().selectedIds).toEqual(['1', '2']);

      store.getState().setList(mockUsers);
      expect(store.getState().selectedIds).toEqual([]);
    });

    it('should clear selectedIds when setList(null) is called', () => {
      const store = getOrCreateStore('users-setlist-null-clears-select', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'multiple',
      });

      store.getState().setList(mockUsers);
      store.getState().setSelectedIds(['1']);
      expect(store.getState().selectedIds).toEqual(['1']);

      store.getState().setList(null);
      expect(store.getState().selectedIds).toEqual([]);
    });
  });

  describe('useSelect', () => {
    it('should return empty selection initially (single)', () => {
      const store = getOrCreateStore('users-select-init', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'single',
      });

      const { result } = renderHook(() => useSelect(store));
      expect(result.current.selected).toBeNull();
      expect(result.current.selectedId).toBeNull();
    });

    it('should select by instance', () => {
      const store = getOrCreateStore('users-select-instance', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'single',
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useSelect(store));

      act(() => { result.current.select(mockUsers[0]); });
      expect(result.current.selectedId).toBe('1');
      expect(result.current.selected).toEqual(mockUsers[0]);
    });

    it('should select by raw number id', () => {
      const store = getOrCreateStore('users-select-num-id', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'single',
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useSelect(store));

      act(() => { result.current.select(2); });
      expect(result.current.selectedId).toBe('2');
      expect(result.current.selected).toEqual(mockUsers[1]);
    });

    it('should select by raw string id', () => {
      const store = getOrCreateStore('users-select-str-id', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'single',
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useSelect(store));

      act(() => { result.current.select('3'); });
      expect(result.current.selectedId).toBe('3');
      expect(result.current.selected).toEqual(mockUsers[2]);
    });

    it('should deselect with select(null)', () => {
      const store = getOrCreateStore('users-select-null', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'single',
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useSelect(store));

      act(() => { result.current.select(mockUsers[0]); });
      expect(result.current.selected).not.toBeNull();

      act(() => { result.current.select(null); });
      expect(result.current.selected).toBeNull();
      expect(result.current.selectedId).toBeNull();
    });

    it('should toggle in single mode: replace selection', () => {
      const store = getOrCreateStore('users-toggle-single', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'single',
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useSelect(store));

      // Toggle on
      act(() => { result.current.toggle(mockUsers[0]); });
      expect(result.current.selectedId).toBe('1');

      // Toggle same → off
      act(() => { result.current.toggle(mockUsers[0]); });
      expect(result.current.selectedId).toBeNull();

      // Toggle on, then toggle different → replaces
      act(() => { result.current.toggle(mockUsers[0]); });
      act(() => { result.current.toggle(mockUsers[1]); });
      expect(result.current.selectedId).toBe('2');
    });

    it('should toggle in multiple mode: add/remove', () => {
      const store = getOrCreateStore('users-toggle-multiple', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'multiple',
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useSelect(store));

      act(() => { result.current.toggle(mockUsers[0]); });
      act(() => { result.current.toggle(mockUsers[1]); });
      expect(result.current.selectedIds).toEqual(['1', '2']);
      expect(result.current.selected).toEqual([mockUsers[0], mockUsers[1]]);

      // Toggle off
      act(() => { result.current.toggle(mockUsers[0]); });
      expect(result.current.selectedIds).toEqual(['2']);
    });

    it('should clear selection', () => {
      const store = getOrCreateStore('users-select-clear', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'multiple',
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useSelect(store));

      act(() => { result.current.toggle(mockUsers[0]); });
      act(() => { result.current.toggle(mockUsers[1]); });
      expect(result.current.selectedIds).toHaveLength(2);

      act(() => { result.current.clear(); });
      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.selected).toEqual([]);
    });

    it('should derive instances from record', () => {
      const store = getOrCreateStore('users-select-derive', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'multiple',
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useSelect(store));

      act(() => { store.getState().setSelectedIds(['1', '3']); });
      expect(result.current.selected).toEqual([mockUsers[0], mockUsers[2]]);
    });

    it('should filter out deleted instances from selected', () => {
      const store = getOrCreateStore('users-select-filter-deleted', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'multiple',
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useSelect(store));

      act(() => { store.getState().setSelectedIds(['1', '2', '3']); });
      expect(result.current.selected).toHaveLength(3);

      // deleteInstance also cleans up selectedIds (Step 4),
      // but let's also verify derived instances handles stale ids
      // by manually setting a stale id
      act(() => { store.getState().setSelectedIds(['1', '999', '3']); });
      expect(result.current.selected).toEqual([mockUsers[0], mockUsers[2]]);
      expect(result.current.selectedIds).toEqual(['1', '999', '3']);
    });

    it('should update selected when record changes', () => {
      const store = getOrCreateStore('users-select-record-change', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'single',
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useSelect(store));

      act(() => { result.current.select(1); });
      expect(result.current.selected).toEqual(mockUsers[0]);
      expect(result.current.selectedId).toBe('1');

      // Update the selected instance
      act(() => { store.getState().updateInstance({ id: 1, name: 'Updated John', email: 'john@example.com' }); });
      expect(result.current.selected!.name).toBe('Updated John');
      expect(result.current.selectedId).toBe('1');
    });
  });

  describe('insertion order preservation', () => {
    it('should preserve insertion order for numeric keys', () => {
      const store = getOrCreateStore('users-order-numeric', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      // Backend returns items sorted by name, but IDs are numeric
      act(() => {
        store.getState().setList([
          { id: 10, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: 'bob@example.com' },
          { id: 5, name: 'Charlie', email: 'charlie@example.com' },
        ]);
      });

      const { result } = renderHook(() => useList(store));
      // Before Map: [{ id: 2 }, { id: 5 }, { id: 10 }] (numeric sort)
      // After Map:  [{ id: 10 }, { id: 2 }, { id: 5 }] (insertion order)
      expect(result.current!.map(i => i.id)).toEqual([10, 2, 5]);
    });

    it('should preserve order when updating existing items', () => {
      const store = getOrCreateStore('users-order-update', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      act(() => {
        store.getState().setList([
          { id: 10, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: 'bob@example.com' },
          { id: 5, name: 'Charlie', email: 'charlie@example.com' },
        ]);
      });

      // Update middle item — order should not change
      act(() => {
        store.getState().updateInstance({ id: 2, name: 'Bob Updated', email: 'bob@example.com' });
      });

      const { result } = renderHook(() => useList(store));
      expect(result.current!.map(i => i.id)).toEqual([10, 2, 5]);
      expect(result.current![1].name).toBe('Bob Updated');
    });

    it('should append new items at the end', () => {
      const store = getOrCreateStore('users-order-append', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      act(() => {
        store.getState().setList([
          { id: 10, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: 'bob@example.com' },
        ]);
      });

      act(() => {
        store.getState().setInstance({ id: 1, name: 'New First', email: 'first@example.com' });
      });

      const { result } = renderHook(() => useList(store));
      // New item appended, not sorted to front
      expect(result.current!.map(i => i.id)).toEqual([10, 2, 1]);
    });
  });

  describe('useGet', () => {
    it('should return null instance when id is null', () => {
      const store = getOrCreateStore('users-useget-null', {
        axios: jest.fn() as any,
        route: '/users',
        actions: { get: true },
      });

      const { result } = renderHook(() => useGet(store, null));
      const [instance, get] = result.current;
      expect(instance).toBeNull();
      expect(get.isLoading).toBe(false);
      expect(get.error).toBeNull();
      expect(typeof get).toBe('function');
    });

    it('should auto-fetch on mount and return instance', async () => {
      const mockUser = { id: 5, name: 'Alice', email: 'alice@example.com' };
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({ data: mockUser });

      const store = getOrCreateStore('users-useget-fetch', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { get: true },
      });

      const { result } = renderHook(() => useGet(store, 5));

      expect(result.current[0]).toBeNull();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[0]).toEqual(mockUser);
      expect(result.current[1].isLoading).toBe(false);
      expect(mockAxiosFn).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'get', url: '/users/5' })
      );
    });

    it('should not fetch when instance is already in store', () => {
      const mockAxiosFn = jest.fn();

      const store = getOrCreateStore('users-useget-existing', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { get: true },
      });

      const existingUser = { id: 3, name: 'Bob', email: 'bob@example.com' };
      act(() => { store.getState().setInstance(existingUser); });

      const { result } = renderHook(() => useGet(store, 3));

      expect(result.current[0]).toEqual(existingUser);
      expect(mockAxiosFn).not.toHaveBeenCalled();
    });

    it('should expose isLoading on get function during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const mockAxiosFn = jest.fn().mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const store = getOrCreateStore('users-useget-loading', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { get: true },
      });

      const { result } = renderHook(() => useGet(store, 1));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[1].isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ data: { id: 1, name: 'John', email: 'john@example.com' } });
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[1].isLoading).toBe(false);
      expect(result.current[0]).toEqual({ id: 1, name: 'John', email: 'john@example.com' });
    });

    it('should expose error on get function and not retry automatically', async () => {
      const mockError = new Error('Network error');
      const mockAxiosFn = jest.fn().mockRejectedValueOnce(mockError);
      const onError = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const store = getOrCreateStore('users-useget-error', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { get: true },
        onError,
      });

      const { result } = renderHook(() => useGet(store, 1));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[0]).toBeNull();
      expect(result.current[1].error).toBe(mockError);
      expect(onError).toHaveBeenCalledWith(mockError);
      expect(mockAxiosFn).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it('should allow manual retry via get() after error', async () => {
      const mockError = new Error('Network error');
      const mockUser = { id: 1, name: 'John', email: 'john@example.com' };
      const mockAxiosFn = jest.fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ data: mockUser });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const store = getOrCreateStore('users-useget-retry', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { get: true },
      });

      const { result } = renderHook(() => useGet(store, 1));

      // First fetch fails
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[1].error).toBe(mockError);

      // Manual retry
      await act(async () => {
        result.current[1]();
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[0]).toEqual(mockUser);
      expect(result.current[1].error).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should not auto-fetch when already loading', async () => {
      let resolvePromise: (value: any) => void;
      const mockAxiosFn = jest.fn().mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const store = getOrCreateStore('users-useget-no-double-fetch', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { get: true },
      });

      const { result } = renderHook(() => useGet(store, 1));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // Only one fetch even though effect ran
      expect(mockAxiosFn).toHaveBeenCalledTimes(1);
      expect(result.current[1].isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ data: { id: 1, name: 'John', email: 'john@example.com' } });
        await new Promise((r) => setTimeout(r, 0));
      });
    });

    it('should return null when data exists but id is not found', () => {
      const store = getOrCreateStore('users-useget-not-found', {
        axios: jest.fn() as any,
        route: '/users',
        actions: { get: true },
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useGet(store, 999));
      expect(result.current[0]).toBeNull();
    });

    it('should return null when called without id', () => {
      const store = getOrCreateStore('users-useget-no-id', {
        axios: jest.fn() as any,
        route: '/users',
        actions: { get: true },
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useGet(store));
      expect(result.current[0]).toBeNull();
      // get() should be a no-op
      act(() => { result.current[1](); });
      expect(result.current[0]).toBeNull();
    });

    it('should work with string ids', async () => {
      const mockUser = { id: 7, name: 'Jane', email: 'jane@example.com' };
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({ data: mockUser });

      const store = getOrCreateStore('users-useget-string-id', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { get: true },
      });

      const { result } = renderHook(() => useGet(store, '7'));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[0]).toEqual(mockUser);
      expect(mockAxiosFn).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'get', url: '/users/7' })
      );
    });
  });

  describe('useGetList', () => {
    it('should auto-fetch on mount when store is empty', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({ data: mockUsers });

      const store = getOrCreateStore('users-usegetlist-auto', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useGetList(store));

      expect(result.current[0]).toBeNull();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[0]).toEqual(mockUsers);
      expect(result.current[1].isLoading).toBe(false);
      expect(mockAxiosFn).toHaveBeenCalledTimes(1);
    });

    it('should not fetch when data already exists', () => {
      const mockAxiosFn = jest.fn();

      const store = getOrCreateStore('users-usegetlist-existing', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useGetList(store));

      expect(result.current[0]).toEqual(mockUsers);
      expect(mockAxiosFn).not.toHaveBeenCalled();
    });

    it('should expose isLoading on getList function during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const mockAxiosFn = jest.fn().mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const store = getOrCreateStore('users-usegetlist-loading', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useGetList(store));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[1].isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ data: mockUsers });
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[1].isLoading).toBe(false);
      expect(result.current[0]).toEqual(mockUsers);
    });

    it('should expose error on getList function and not retry automatically', async () => {
      const mockError = new Error('Network error');
      const mockAxiosFn = jest.fn().mockRejectedValueOnce(mockError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const store = getOrCreateStore('users-usegetlist-error', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useGetList(store));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[0]).toBeNull();
      expect(result.current[1].error).toBe(mockError);
      expect(mockAxiosFn).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it('should allow manual refetch via getList()', async () => {
      const mockAxiosFn = jest.fn()
        .mockResolvedValueOnce({ data: mockUsers })
        .mockResolvedValueOnce({ data: [...mockUsers, { id: 4, name: 'New', email: 'new@example.com' }] });

      const store = getOrCreateStore('users-usegetlist-refetch', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useGetList(store));

      // Auto-fetch
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[0]).toHaveLength(3);

      // Manual refetch
      await act(async () => {
        result.current[1]();
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[0]).toHaveLength(4);
      expect(mockAxiosFn).toHaveBeenCalledTimes(2);
    });

    it('should handle paginated response format', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({
        data: { results: mockUsers, count: 100 },
      });

      const store = getOrCreateStore('users-usegetlist-paginated', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
        pagination: {
          limit: 10,
          prepare: (data: any) => ({ count: data.count }),
        },
      });

      const { result } = renderHook(() => useGetList(store));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[0]).toEqual(mockUsers);
      expect(store.getState().pagination?.count).toBe(100);
    });

    it('should not auto-fetch when already loading', async () => {
      let resolvePromise: (value: any) => void;
      const mockAxiosFn = jest.fn().mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const store = getOrCreateStore('users-usegetlist-no-double-fetch', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useGetList(store));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[1].isLoading).toBe(true);
      expect(mockAxiosFn).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolvePromise!({ data: mockUsers });
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[0]).toEqual(mockUsers);
    });

    it('should not retry after error', async () => {
      const mockError = new Error('Network error');
      const mockAxiosFn = jest.fn().mockRejectedValueOnce(mockError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const store = getOrCreateStore('users-usegetlist-error-no-retry', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useGetList(store));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current[0]).toBeNull();
      expect(result.current[1].error).toBe(mockError);
      expect(mockAxiosFn).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });

  describe('useCrud with id', () => {
    it('should auto-fetch and return instance when id is provided', async () => {
      const mockUser = { id: 5, name: 'Alice', email: 'alice@example.com' };
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({ data: mockUser });

      const store = getOrCreateStore('users-usecrud-id-fetch', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { get: true },
      });

      const { result } = renderHook(() => useCrud(store, 5));

      expect(result.current.instance).toBeNull();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.instance).toEqual(mockUser);
    });

    it('should skip fetch when instance already in store', () => {
      const mockAxiosFn = jest.fn();

      const store = getOrCreateStore('users-usecrud-id-existing', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { get: true },
      });

      const existingUser = { id: 3, name: 'Bob', email: 'bob@example.com' };
      act(() => { store.getState().setInstance(existingUser); });

      const { result } = renderHook(() => useCrud(store, 3));

      expect(result.current.instance).toEqual(existingUser);
      expect(mockAxiosFn).not.toHaveBeenCalled();
    });

    it('should return null instance when no id is provided', () => {
      const store = getOrCreateStore('users-usecrud-no-id', {
        axios: jest.fn() as any,
        route: '/users',
        actions: { get: true },
      });

      const { result } = renderHook(() => useCrud(store));

      expect(result.current.instance).toBeNull();
    });

    it('should return null instance when id is null', () => {
      const mockAxiosFn = jest.fn();

      const store = getOrCreateStore('users-usecrud-null-id', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { get: true },
      });

      const { result } = renderHook(() => useCrud(store, null));

      expect(result.current.instance).toBeNull();
      expect(mockAxiosFn).not.toHaveBeenCalled();
    });

    it('should not auto-fetch when get action has error', async () => {
      const mockError = new Error('Network error');
      const mockAxiosFn = jest.fn().mockRejectedValueOnce(mockError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const store = getOrCreateStore('users-usecrud-id-error', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { get: true },
      });

      const { result } = renderHook(() => useCrud(store, 1));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.instance).toBeNull();
      expect(result.current.get.error).toBe(mockError);
      // Should not retry automatically
      expect(mockAxiosFn).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it('should not auto-fetch when already loading', async () => {
      let resolvePromise: (value: any) => void;
      const mockAxiosFn = jest.fn().mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const store = getOrCreateStore('users-usecrud-id-loading', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { get: true },
      });

      const { result } = renderHook(() => useCrud(store, 1));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.get.isLoading).toBe(true);
      expect(mockAxiosFn).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolvePromise!({ data: { id: 1, name: 'John', email: 'john@example.com' } });
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.instance).toEqual({ id: 1, name: 'John', email: 'john@example.com' });
    });

    it('should not auto-fetch when get is not configured', () => {
      const mockAxiosFn = jest.fn();

      const store = getOrCreateStore('users-usecrud-id-no-get', {
        axios: mockAxiosFn as any,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useCrud(store, 1));

      expect(result.current.instance).toBeUndefined();
      expect(mockAxiosFn).not.toHaveBeenCalled();
    });
  });

  describe('deleteInstance cleans up selectedIds', () => {
    it('should remove deleted id from selectedIds', () => {
      const store = getOrCreateStore('users-delete-cleans-select', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'multiple',
      });

      store.getState().setList(mockUsers);
      store.getState().setSelectedIds(['1', '2', '3']);

      store.getState().deleteInstance({ id: 2 } as any);
      expect(store.getState().selectedIds).toEqual(['1', '3']);
    });

    it('should not affect selectedIds when deleting a non-selected instance', () => {
      const store = getOrCreateStore('users-delete-nonselected', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
        select: 'single',
      });

      store.getState().setList(mockUsers);
      store.getState().setSelectedIds(['1']);

      store.getState().deleteInstance({ id: 3 } as any);
      expect(store.getState().selectedIds).toEqual(['1']);
    });
  });
});
