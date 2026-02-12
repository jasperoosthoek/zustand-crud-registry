import { createStoreRegistry } from '../src/createStoreRegistry';
import { useList } from '../src/useList';
import { useRecord } from '../src/useRecord';
import { useInstance } from '../src/useRecord';
import { useActions } from '../src/useActions';
import { usePagination } from '../src/usePagination';
import { useCrudState } from '../src/useCrudState';
import { useSelect } from '../src/useSelect';
import { renderHook, act } from '@testing-library/react';

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

  describe('useInstance', () => {
    it('should return null when no data is loaded', () => {
      const store = getOrCreateStore('users-instance-null', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      const { result } = renderHook(() => useInstance(store, 1));
      expect(result.current).toBeNull();
    });

    it('should return the instance by id', () => {
      const store = getOrCreateStore('users-instance-get', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useInstance(store, 2));
      expect(result.current).toEqual(mockUsers[1]);
    });

    it('should return null for non-existent id', () => {
      const store = getOrCreateStore('users-instance-missing', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useInstance(store, 999));
      expect(result.current).toBeNull();
    });

    it('should work with string ids', () => {
      const store = getOrCreateStore('users-instance-string-id', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useInstance(store, '1'));
      expect(result.current).toEqual(mockUsers[0]);
    });

    it('should update when the specific instance changes', () => {
      const store = getOrCreateStore('users-instance-update', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useInstance(store, 1));
      expect(result.current!.name).toBe('John Doe');

      act(() => { store.getState().updateInstance({ id: 1, name: 'Updated John', email: 'john@example.com' }); });
      expect(result.current!.name).toBe('Updated John');
    });

    it('should return null after the instance is deleted', () => {
      const store = getOrCreateStore('users-instance-delete', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useInstance(store, 1));
      expect(result.current).not.toBeNull();

      act(() => { store.getState().deleteInstance({ id: 1 }); });
      expect(result.current).toBeNull();
    });

    it('should return null after setList(null)', () => {
      const store = getOrCreateStore('users-instance-clear', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      act(() => { store.getState().setList(mockUsers); });

      const { result } = renderHook(() => useInstance(store, 1));
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

      expect(store.getState().record).toEqual({
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
      expect(store.getState().record).not.toBeNull();

      store.getState().setList(null);
      expect(store.getState().record).toBeNull();
    });

    it('should reset from populated to null and back', () => {
      const store = getOrCreateStore('users-setlist-null-cycle', {
        axios: mockAxios,
        route: '/users',
        actions: { getList: true },
      });

      store.getState().setList(mockUsers);
      expect(Object.keys(store.getState().record!)).toHaveLength(3);

      store.getState().setList(null);
      expect(store.getState().record).toBeNull();

      store.getState().setList([mockUsers[0]]);
      expect(Object.keys(store.getState().record!)).toHaveLength(1);
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
