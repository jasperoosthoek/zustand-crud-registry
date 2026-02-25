import { createStoreRegistry } from '../src/createStoreRegistry';
import { useCrud } from '../src/useCrud';
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

interface UuidItem {
  uuid: string;
  name: string;
}

interface SlugItem {
  id: number;
  slug: string;
  name: string;
}

interface DualKeyItem {
  uuid: string;
  slug: string;
  name: string;
}

describe('custom id and byKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Custom id (id: 'uuid') ─────────────────────────────────────────
  // byKey defaults to 'uuid', so both store keying and routes use uuid.

  describe('custom id (id: "uuid")', () => {
    let getOrCreate: ReturnType<typeof createStoreRegistry<{ items: UuidItem }>>;

    beforeEach(() => {
      getOrCreate = createStoreRegistry<{ items: UuidItem }>();
    });

    it('should key store data by uuid', () => {
      const store = getOrCreate('items', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { getList: true },
      });

      const items: UuidItem[] = [
        { uuid: 'abc-123', name: 'Item A' },
        { uuid: 'def-456', name: 'Item B' },
      ];
      store.getState().setList(items);

      const data = store.getState().data!;
      expect(data.get('abc-123')).toEqual(items[0]);
      expect(data.get('def-456')).toEqual(items[1]);
      expect(data.get('0')).toBeUndefined();
    });

    it('should setInstance/updateInstance/deleteInstance by uuid', () => {
      const store = getOrCreate('items_crud', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { get: true, create: true, update: true, delete: true },
      });

      const item: UuidItem = { uuid: 'abc-123', name: 'Item A' };
      store.getState().setInstance(item);
      expect(store.getState().data!.get('abc-123')).toEqual(item);

      store.getState().updateInstance({ uuid: 'abc-123', name: 'Updated A' } as UuidItem);
      expect(store.getState().data!.get('abc-123')).toEqual({ uuid: 'abc-123', name: 'Updated A' });

      store.getState().deleteInstance({ uuid: 'abc-123' } as UuidItem);
      expect(store.getState().data!.get('abc-123')).toBeUndefined();
    });

    it('should patchList by uuid', () => {
      const store = getOrCreate('items_patch', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { getList: true },
      });

      store.getState().setList([
        { uuid: 'abc-123', name: 'Item A' },
        { uuid: 'def-456', name: 'Item B' },
      ]);

      store.getState().patchList([{ uuid: 'abc-123', name: 'Patched A' }]);

      expect(store.getState().data!.get('abc-123')).toEqual({ uuid: 'abc-123', name: 'Patched A' });
      expect(store.getState().data!.get('def-456')).toEqual({ uuid: 'def-456', name: 'Item B' });
    });

    it('should updateList by uuid and track new items for pagination', () => {
      const store = getOrCreate('items_updateList', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { getList: true },
        pagination: { limit: 10 },
      });

      store.getState().setList([{ uuid: 'abc-123', name: 'Item A' }]);
      store.getState().setPagination({ count: 1 });

      store.getState().updateList([
        { uuid: 'abc-123', name: 'Updated A' }, // existing — no count bump
        { uuid: 'new-789', name: 'New Item' },  // new — count bumps
      ]);

      expect(store.getState().data!.get('abc-123')).toEqual({ uuid: 'abc-123', name: 'Updated A' });
      expect(store.getState().data!.get('new-789')).toEqual({ uuid: 'new-789', name: 'New Item' });
      expect(store.getState().pagination!.count).toBe(2);
    });

    it('should build detail route using uuid field', () => {
      const store = getOrCreate('items_route', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { get: true },
      });

      const routeFn = store.config.actions.get.route;
      expect(typeof routeFn).toBe('function');
      expect((routeFn as Function)({ uuid: 'abc-123' }, { args: undefined, params: undefined }))
        .toBe('/items/abc-123');
    });

    it('should auto-fetch with { uuid: value } in useCrud(store, id)', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({
        data: { uuid: 'abc-123', name: 'Fetched' },
      });
      Object.assign(mockAxiosFn, mockAxios);

      const store = getOrCreate('items_autofetch', {
        axios: mockAxiosFn as any,
        route: '/items',
        id: 'uuid',
        actions: { get: true, getList: true },
      });

      const { result } = renderHook(() => useCrud(store, 'abc-123'));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // Should call API with route built from uuid
      expect(mockAxiosFn).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/items/abc-123',
        }),
      );

      // Instance stored by uuid, lookup by uuid works
      expect(result.current.instance).toEqual({ uuid: 'abc-123', name: 'Fetched' });
    });

    it('should track uuid value in loading state on update', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({
        data: { uuid: 'abc-123', name: 'Updated' },
      });
      Object.assign(mockAxiosFn, mockAxios);

      const store = getOrCreate('items_loading', {
        axios: mockAxiosFn as any,
        route: '/items',
        id: 'uuid',
        actions: { update: true, getList: true },
      });

      store.getState().setList([{ uuid: 'abc-123', name: 'Original' }]);

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.update({ uuid: 'abc-123', name: 'Updated' });
      });

      expect(result.current.update.id).toBe('abc-123');
    });

    it('should track uuid value in loading state on delete', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({ data: {} });
      Object.assign(mockAxiosFn, mockAxios);

      const store = getOrCreate('items_delete_loading', {
        axios: mockAxiosFn as any,
        route: '/items',
        id: 'uuid',
        actions: { delete: true, getList: true },
      });

      store.getState().setList([{ uuid: 'abc-123', name: 'Item A' }]);

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.delete({ uuid: 'abc-123' });
      });

      expect(result.current.delete.id).toBe('abc-123');
    });

    it('should select/toggle/clear by uuid', () => {
      const store = getOrCreate('items_select', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { getList: true },
        select: 'single',
      });

      const items: UuidItem[] = [
        { uuid: 'abc-123', name: 'Item A' },
        { uuid: 'def-456', name: 'Item B' },
      ];
      store.getState().setList(items);

      const { result } = renderHook(() => useCrud(store));

      // Select by instance
      act(() => { result.current.select(items[0]); });
      expect(result.current.selected).toEqual(items[0]);
      expect(store.getState().selectedIds).toEqual(['abc-123']);

      // Toggle off
      act(() => { result.current.toggle(items[0]); });
      expect(result.current.selected).toBeNull();

      // Select by raw uuid string
      act(() => { result.current.select('def-456'); });
      expect(result.current.selected).toEqual(items[1]);

      act(() => { result.current.clear(); });
      expect(result.current.selected).toBeNull();
    });

    it('should delete and clean up selectedIds by uuid', () => {
      const store = getOrCreate('items_delete_select', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { getList: true },
        select: 'multiple',
      });

      store.getState().setList([
        { uuid: 'abc-123', name: 'Item A' },
        { uuid: 'def-456', name: 'Item B' },
      ]);
      store.getState().setSelectedIds(['abc-123', 'def-456']);

      store.getState().deleteInstance({ uuid: 'abc-123' } as UuidItem);

      expect(store.getState().selectedIds).toEqual(['def-456']);
    });

    it('should decrement pagination count on delete by uuid', () => {
      const store = getOrCreate('items_delete_pag', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { getList: true },
        pagination: { limit: 10 },
      });

      store.getState().setList([
        { uuid: 'abc-123', name: 'Item A' },
        { uuid: 'def-456', name: 'Item B' },
      ]);
      store.getState().setPagination({ count: 2 });

      store.getState().deleteInstance({ uuid: 'abc-123' } as UuidItem);

      expect(store.getState().data!.get('abc-123')).toBeUndefined();
      expect(store.getState().pagination!.count).toBe(1);
    });
  });

  // ── Custom byKey (byKey: 'slug', id stays 'id') ────────────────────
  // Map keyed by slug. Routes use id. Select resolves by slug.

  describe('custom byKey (byKey: "slug")', () => {
    let getOrCreate: ReturnType<typeof createStoreRegistry<{ items: SlugItem }>>;

    beforeEach(() => {
      getOrCreate = createStoreRegistry<{ items: SlugItem }>();
    });

    it('should key store data by slug, not by id', () => {
      const store = getOrCreate('items', {
        axios: mockAxios as any,
        route: '/items',
        byKey: 'slug',
        actions: { getList: true },
      });

      const items: SlugItem[] = [
        { id: 1, slug: 'item-a', name: 'Item A' },
        { id: 2, slug: 'item-b', name: 'Item B' },
      ];
      store.getState().setList(items);

      const data = store.getState().data!;
      expect(data.get('item-a')).toEqual(items[0]);
      expect(data.get('item-b')).toEqual(items[1]);
      // NOT keyed by id
      expect(data.get('1')).toBeUndefined();
      expect(data.get('2')).toBeUndefined();
    });

    it('should setInstance/updateInstance/deleteInstance by slug', () => {
      const store = getOrCreate('items_crud', {
        axios: mockAxios as any,
        route: '/items',
        byKey: 'slug',
        actions: { get: true, create: true, update: true, delete: true },
      });

      const item: SlugItem = { id: 1, slug: 'item-a', name: 'Item A' };
      store.getState().setInstance(item);
      expect(store.getState().data!.get('item-a')).toEqual(item);

      store.getState().updateInstance({ id: 1, slug: 'item-a', name: 'Updated A' });
      expect(store.getState().data!.get('item-a')!.name).toBe('Updated A');

      store.getState().deleteInstance({ id: 1, slug: 'item-a', name: '' });
      expect(store.getState().data!.get('item-a')).toBeUndefined();
    });

    it('should patchList by slug', () => {
      const store = getOrCreate('items_patch', {
        axios: mockAxios as any,
        route: '/items',
        byKey: 'slug',
        actions: { getList: true },
      });

      store.getState().setList([
        { id: 1, slug: 'item-a', name: 'Item A' },
        { id: 2, slug: 'item-b', name: 'Item B' },
      ]);

      store.getState().patchList([{ id: 1, slug: 'item-a', name: 'Patched A' }]);

      expect(store.getState().data!.get('item-a')!.name).toBe('Patched A');
      expect(store.getState().data!.get('item-b')!.name).toBe('Item B');
    });

    it('should still use id field for detail routes, not slug', () => {
      const store = getOrCreate('items_route', {
        axios: mockAxios as any,
        route: '/items',
        byKey: 'slug',
        actions: { get: true },
      });

      const routeFn = store.config.actions.get.route;
      // Route uses config.id ('id' by default), not byKey
      expect((routeFn as Function)({ id: 42, slug: 'item-a' }, { args: undefined, params: undefined }))
        .toBe('/items/42');
    });

    it('should select/toggle by slug', () => {
      const store = getOrCreate('items_select', {
        axios: mockAxios as any,
        route: '/items',
        byKey: 'slug',
        actions: { getList: true },
        select: 'multiple',
      });

      const items: SlugItem[] = [
        { id: 1, slug: 'item-a', name: 'Item A' },
        { id: 2, slug: 'item-b', name: 'Item B' },
        { id: 3, slug: 'item-c', name: 'Item C' },
      ];
      store.getState().setList(items);

      const { result } = renderHook(() => useCrud(store));

      act(() => { result.current.toggle(items[0]); });
      act(() => { result.current.toggle(items[2]); });
      expect(result.current.selected).toEqual([items[0], items[2]]);
      expect(store.getState().selectedIds).toEqual(['item-a', 'item-c']);

      // Select by raw slug string
      act(() => { result.current.clear(); });
      act(() => { result.current.select('item-b'); });
      expect(store.getState().selectedIds).toEqual(['item-b']);
    });

    it('should delete by slug and clean up selectedIds', () => {
      const store = getOrCreate('items_delete_select', {
        axios: mockAxios as any,
        route: '/items',
        byKey: 'slug',
        actions: { getList: true },
        select: 'multiple',
      });

      store.getState().setList([
        { id: 1, slug: 'item-a', name: 'Item A' },
        { id: 2, slug: 'item-b', name: 'Item B' },
      ]);
      store.getState().setSelectedIds(['item-a', 'item-b']);

      store.getState().deleteInstance({ id: 1, slug: 'item-a', name: '' });

      expect(store.getState().data!.get('item-a')).toBeUndefined();
      expect(store.getState().selectedIds).toEqual(['item-b']);
    });

    describe('useCrud lookup when byKey !== id', () => {
      // The Map is keyed by slug. useCrud(store, value) does data.get(String(value)).
      // The caller must pass the byKey value (slug), not the numeric id.

      it('should find instance when passing slug (byKey value)', () => {
        const store = getOrCreate('items_lookup_ok', {
          axios: mockAxios as any,
          route: '/items',
          byKey: 'slug',
          actions: { get: true, getList: true },
        });

        store.getState().setList([{ id: 1, slug: 'item-a', name: 'Item A' }]);

        const { result } = renderHook(() => useCrud(store, 'item-a'));

        expect(result.current.instance).toEqual({ id: 1, slug: 'item-a', name: 'Item A' });
      });

      it('should NOT find instance when passing numeric id (Map keyed by slug)', () => {
        const store = getOrCreate('items_lookup_fail', {
          axios: mockAxios as any,
          route: '/items',
          byKey: 'slug',
          actions: { get: true, getList: true },
        });

        store.getState().setList([{ id: 1, slug: 'item-a', name: 'Item A' }]);

        // Passing numeric id — lookup fails
        const { result } = renderHook(() => useCrud(store, 1));

        expect(result.current.instance).toBeNull();
      });

      it('should auto-fetch sends { id: slug } when byKey !== id (design issue)', async () => {
        // When byKey: 'slug' and id: 'id' (default), useCrud(store, 'item-a')
        // auto-fetches with { id: 'item-a' } — the API field is 'id' but the
        // value is the slug. This is a known design limitation when byKey !== id:
        // the single parameter can't serve both Map lookup and API request.

        const mockAxiosFn = jest.fn().mockResolvedValueOnce({
          data: { id: 1, slug: 'item-a', name: 'Fetched' },
        });
        Object.assign(mockAxiosFn, mockAxios);

        const store = getOrCreate('items_autofetch_slug', {
          axios: mockAxiosFn as any,
          route: '/items',
          byKey: 'slug',
          actions: { get: true, getList: true },
        });

        renderHook(() => useCrud(store, 'item-a'));

        await act(async () => {
          await new Promise((r) => setTimeout(r, 0));
        });

        // Auto-fetch sends { id: 'item-a' } — 'id' is config.id, value is the slug
        expect(mockAxiosFn).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/items/item-a',
          }),
        );
      });
    });
  });

  // ── Both different (id: 'uuid', byKey: 'slug') ─────────────────────
  // Routes use uuid. Store keyed by slug. Loading state tracks uuid.

  describe('both id and byKey different (id: "uuid", byKey: "slug")', () => {
    let getOrCreate: ReturnType<typeof createStoreRegistry<{ items: DualKeyItem }>>;

    beforeEach(() => {
      getOrCreate = createStoreRegistry<{ items: DualKeyItem }>();
    });

    it('should key store by slug, build detail route with uuid', () => {
      const store = getOrCreate('items', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        byKey: 'slug',
        actions: { get: true, getList: true },
      });

      const items: DualKeyItem[] = [
        { uuid: 'u1', slug: 'item-a', name: 'Item A' },
        { uuid: 'u2', slug: 'item-b', name: 'Item B' },
      ];
      store.getState().setList(items);

      // Store keyed by slug
      expect(store.getState().data!.get('item-a')).toEqual(items[0]);
      expect(store.getState().data!.get('u1')).toBeUndefined();

      // Route uses uuid
      const routeFn = store.config.actions.get.route;
      expect((routeFn as Function)({ uuid: 'u1', slug: 'item-a' }, { args: undefined, params: undefined }))
        .toBe('/items/u1');
    });

    it('should track uuid in loading state on update', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({
        data: { uuid: 'u1', slug: 'item-a', name: 'Updated' },
      });
      Object.assign(mockAxiosFn, mockAxios);

      const store = getOrCreate('items_loading', {
        axios: mockAxiosFn as any,
        route: '/items',
        id: 'uuid',
        byKey: 'slug',
        actions: { update: true, getList: true },
      });

      store.getState().setList([{ uuid: 'u1', slug: 'item-a', name: 'Original' }]);

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.update({ uuid: 'u1', slug: 'item-a', name: 'Updated' });
      });

      // Loading state id is uuid (config.id), not slug (byKey)
      expect(result.current.update.id).toBe('u1');
    });

    it('should track uuid in loading state on delete', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({ data: {} });
      Object.assign(mockAxiosFn, mockAxios);

      const store = getOrCreate('items_delete_loading', {
        axios: mockAxiosFn as any,
        route: '/items',
        id: 'uuid',
        byKey: 'slug',
        actions: { delete: true, getList: true },
      });

      store.getState().setList([{ uuid: 'u1', slug: 'item-a', name: 'Item A' }]);

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.delete({ uuid: 'u1', slug: 'item-a' });
      });

      expect(result.current.delete.id).toBe('u1');
    });

    it('should select by slug (byKey), not uuid', () => {
      const store = getOrCreate('items_select', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        byKey: 'slug',
        actions: { getList: true },
        select: 'single',
      });

      const items: DualKeyItem[] = [
        { uuid: 'u1', slug: 'item-a', name: 'Item A' },
        { uuid: 'u2', slug: 'item-b', name: 'Item B' },
      ];
      store.getState().setList(items);

      const { result } = renderHook(() => useCrud(store));

      act(() => { result.current.select(items[0]); });
      expect(result.current.selected).toEqual(items[0]);
      expect(store.getState().selectedIds).toEqual(['item-a']); // slug, not uuid

      act(() => { result.current.select('item-b'); });
      expect(result.current.selected).toEqual(items[1]);
    });

    it('should delete by slug and clean up selectedIds by slug', () => {
      const store = getOrCreate('items_delete_select', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        byKey: 'slug',
        actions: { getList: true },
        select: 'multiple',
      });

      store.getState().setList([
        { uuid: 'u1', slug: 'item-a', name: 'Item A' },
        { uuid: 'u2', slug: 'item-b', name: 'Item B' },
      ]);
      store.getState().setSelectedIds(['item-a', 'item-b']);

      store.getState().deleteInstance({ uuid: 'u1', slug: 'item-a', name: '' });

      expect(store.getState().data!.get('item-a')).toBeUndefined();
      expect(store.getState().selectedIds).toEqual(['item-b']);
    });

    it('useCrud(store, slug) should find instance (Map keyed by slug)', () => {
      const store = getOrCreate('items_lookup_ok', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        byKey: 'slug',
        actions: { get: true, getList: true },
      });

      store.getState().setList([{ uuid: 'u1', slug: 'item-a', name: 'Item A' }]);

      // Must pass slug for Map lookup to work
      const { result } = renderHook(() => useCrud(store, 'item-a'));
      expect(result.current.instance).toEqual({ uuid: 'u1', slug: 'item-a', name: 'Item A' });
    });

    it('useCrud(store, uuid) should NOT find instance (Map keyed by slug)', () => {
      const store = getOrCreate('items_lookup_fail', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        byKey: 'slug',
        actions: { get: true, getList: true },
      });

      store.getState().setList([{ uuid: 'u1', slug: 'item-a', name: 'Item A' }]);

      // Passing uuid — lookup fails because Map is keyed by slug
      const { result } = renderHook(() => useCrud(store, 'u1'));
      expect(result.current.instance).toBeNull();
    });

    it('auto-fetch sends { uuid: slug } — value mismatch when byKey !== id', async () => {
      // When id: 'uuid' and byKey: 'slug', useCrud(store, 'item-a') auto-fetches
      // with { uuid: 'item-a' }. The API field name ('uuid') is correct,
      // but the value ('item-a') is the slug, not the actual uuid.
      // This is a fundamental limitation: the single id parameter can't serve
      // both Map lookup (needs slug) and API request (needs uuid).

      const mockAxiosFn = jest.fn().mockResolvedValueOnce({
        data: { uuid: 'u1', slug: 'item-a', name: 'Fetched' },
      });
      Object.assign(mockAxiosFn, mockAxios);

      const store = getOrCreate('items_autofetch', {
        axios: mockAxiosFn as any,
        route: '/items',
        id: 'uuid',
        byKey: 'slug',
        actions: { get: true, getList: true },
      });

      renderHook(() => useCrud(store, 'item-a'));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // The route receives slug value in the uuid position
      expect(mockAxiosFn).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/items/item-a', // 'item-a' is slug, not a uuid
        }),
      );
    });
  });
});
