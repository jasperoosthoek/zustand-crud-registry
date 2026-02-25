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

// Section 1: routes use slug, Map keys by id (default)
interface SlugItem {
  id: number;
  slug: string;
  name: string;
}

// Section 2: both numeric id and uuid; Map keyed by uuid, routes use numeric id
interface UuidKeyItem {
  id: number;
  uuid: string;
  name: string;
}

// Section 3: both uuid and slug; routes use slug, Map keyed by uuid
interface DualKeyItem {
  uuid: string;
  slug: string;
  name: string;
}

describe('custom detailKey and id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Custom detailKey (detailKey: 'slug') ──────────────────────────────
  // id defaults to 'id', so Map keyed by id. Routes use slug.

  describe('custom detailKey (detailKey: "slug")', () => {
    let getOrCreate: ReturnType<typeof createStoreRegistry<{ items: SlugItem }>>;

    beforeEach(() => {
      getOrCreate = createStoreRegistry<{ items: SlugItem }>();
    });

    it('should key store data by id, not slug', () => {
      const store = getOrCreate('items', {
        axios: mockAxios as any,
        route: '/items',
        detailKey: 'slug',
        actions: { getList: true },
      });

      const items: SlugItem[] = [
        { id: 1, slug: 'item-a', name: 'Item A' },
        { id: 2, slug: 'item-b', name: 'Item B' },
      ];
      store.getState().setList(items);

      const data = store.getState().data!;
      // Map keyed by id (default), not slug
      expect(data.get('1')).toEqual(items[0]);
      expect(data.get('2')).toEqual(items[1]);
      expect(data.get('item-a')).toBeUndefined();
    });

    it('should setInstance/updateInstance/deleteInstance by id', () => {
      const store = getOrCreate('items_crud', {
        axios: mockAxios as any,
        route: '/items',
        detailKey: 'slug',
        actions: { get: true, create: true, update: true, delete: true },
      });

      const item: SlugItem = { id: 1, slug: 'item-a', name: 'Item A' };
      store.getState().setInstance(item);
      expect(store.getState().data!.get('1')).toEqual(item);

      store.getState().updateInstance({ id: 1, slug: 'item-a', name: 'Updated A' });
      expect(store.getState().data!.get('1')).toEqual({ id: 1, slug: 'item-a', name: 'Updated A' });

      store.getState().deleteInstance({ id: 1, slug: 'item-a', name: '' });
      expect(store.getState().data!.get('1')).toBeUndefined();
    });

    it('should patchList by id', () => {
      const store = getOrCreate('items_patch', {
        axios: mockAxios as any,
        route: '/items',
        detailKey: 'slug',
        actions: { getList: true },
      });

      store.getState().setList([
        { id: 1, slug: 'item-a', name: 'Item A' },
        { id: 2, slug: 'item-b', name: 'Item B' },
      ]);

      store.getState().patchList([{ id: 1, slug: 'item-a', name: 'Patched A' }]);

      expect(store.getState().data!.get('1')!.name).toBe('Patched A');
      expect(store.getState().data!.get('2')!.name).toBe('Item B');
    });

    it('should updateList by id and track new items for pagination', () => {
      const store = getOrCreate('items_updateList', {
        axios: mockAxios as any,
        route: '/items',
        detailKey: 'slug',
        actions: { getList: true },
        pagination: { limit: 10 },
      });

      store.getState().setList([{ id: 1, slug: 'item-a', name: 'Item A' }]);
      store.getState().setPagination({ count: 1 });

      store.getState().updateList([
        { id: 1, slug: 'item-a', name: 'Updated A' },   // existing — no count bump
        { id: 3, slug: 'new-item', name: 'New Item' },   // new — count bumps
      ]);

      expect(store.getState().data!.get('1')!.name).toBe('Updated A');
      expect(store.getState().data!.get('3')!.name).toBe('New Item');
      expect(store.getState().pagination!.count).toBe(2);
    });

    it('should build detail route using slug field', () => {
      const store = getOrCreate('items_route', {
        axios: mockAxios as any,
        route: '/items',
        detailKey: 'slug',
        actions: { get: true },
      });

      const routeFn = store.config.actions.get.route;
      expect(typeof routeFn).toBe('function');
      // Route uses detailKey ('slug'), not id
      expect((routeFn as Function)({ id: 1, slug: 'item-a' }, { args: undefined, params: undefined }))
        .toBe('/items/item-a');
    });

    it('should auto-fetch with { slug: value } in useCrud(store, id)', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({
        data: { id: 1, slug: 'item-a', name: 'Fetched' },
      });
      Object.assign(mockAxiosFn, mockAxios);

      const store = getOrCreate('items_autofetch', {
        axios: mockAxiosFn as any,
        route: '/items',
        detailKey: 'slug',
        actions: { get: true, getList: true },
      });

      // Default by: detailKey ('slug'). id !== detailKey → scan for item.slug === 'item-a'
      const { result } = renderHook(() => useCrud(store, 'item-a'));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // Route built from slug (detailKey)
      expect(mockAxiosFn).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/items/item-a',
        }),
      );

      // Instance stored by id, found via detailKey scan
      expect(result.current.instance).toEqual({ id: 1, slug: 'item-a', name: 'Fetched' });
    });

    it('should track slug value in loading state on update', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({
        data: { id: 1, slug: 'item-a', name: 'Updated' },
      });
      Object.assign(mockAxiosFn, mockAxios);

      const store = getOrCreate('items_loading', {
        axios: mockAxiosFn as any,
        route: '/items',
        detailKey: 'slug',
        actions: { update: true, getList: true },
      });

      store.getState().setList([{ id: 1, slug: 'item-a', name: 'Original' }]);

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.update({ id: 1, slug: 'item-a', name: 'Updated' });
      });

      // Loading state tracks detailKey value (slug), not id
      expect(result.current.update.id).toBe('item-a');
    });

    it('should track slug value in loading state on delete', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({ data: {} });
      Object.assign(mockAxiosFn, mockAxios);

      const store = getOrCreate('items_delete_loading', {
        axios: mockAxiosFn as any,
        route: '/items',
        detailKey: 'slug',
        actions: { delete: true, getList: true },
      });

      store.getState().setList([{ id: 1, slug: 'item-a', name: 'Item A' }]);

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.delete({ id: 1, slug: 'item-a' });
      });

      expect(result.current.delete.id).toBe('item-a');
    });

    it('should select/toggle/clear by id', () => {
      const store = getOrCreate('items_select', {
        axios: mockAxios as any,
        route: '/items',
        detailKey: 'slug',
        actions: { getList: true },
        select: 'single',
      });

      const items: SlugItem[] = [
        { id: 1, slug: 'item-a', name: 'Item A' },
        { id: 2, slug: 'item-b', name: 'Item B' },
      ];
      store.getState().setList(items);

      const { result } = renderHook(() => useCrud(store));

      // Select by instance — selectedIds uses config.id ('id')
      act(() => { result.current.select(items[0]); });
      expect(result.current.selected).toEqual(items[0]);
      expect(store.getState().selectedIds).toEqual(['1']);

      // Toggle off
      act(() => { result.current.toggle(items[0]); });
      expect(result.current.selected).toBeNull();

      // Select by raw id value
      act(() => { result.current.select(2); });
      expect(result.current.selected).toEqual(items[1]);

      act(() => { result.current.clear(); });
      expect(result.current.selected).toBeNull();
    });

    it('should delete and clean up selectedIds by id', () => {
      const store = getOrCreate('items_delete_select', {
        axios: mockAxios as any,
        route: '/items',
        detailKey: 'slug',
        actions: { getList: true },
        select: 'multiple',
      });

      store.getState().setList([
        { id: 1, slug: 'item-a', name: 'Item A' },
        { id: 2, slug: 'item-b', name: 'Item B' },
      ]);
      store.getState().setSelectedIds(['1', '2']);

      store.getState().deleteInstance({ id: 1, slug: 'item-a', name: '' });

      expect(store.getState().selectedIds).toEqual(['2']);
    });

    it('should decrement pagination count on delete', () => {
      const store = getOrCreate('items_delete_pag', {
        axios: mockAxios as any,
        route: '/items',
        detailKey: 'slug',
        actions: { getList: true },
        pagination: { limit: 10 },
      });

      store.getState().setList([
        { id: 1, slug: 'item-a', name: 'Item A' },
        { id: 2, slug: 'item-b', name: 'Item B' },
      ]);
      store.getState().setPagination({ count: 2 });

      store.getState().deleteInstance({ id: 1, slug: 'item-a', name: '' });

      expect(store.getState().data!.get('1')).toBeUndefined();
      expect(store.getState().pagination!.count).toBe(1);
    });
  });

  // ── Custom id (id: 'uuid', detailKey defaults to 'uuid') ─────────────
  // Map keyed by uuid. Routes also use uuid (detailKey defaults to id).

  describe('custom id (id: "uuid")', () => {
    let getOrCreate: ReturnType<typeof createStoreRegistry<{ items: UuidKeyItem }>>;

    beforeEach(() => {
      getOrCreate = createStoreRegistry<{ items: UuidKeyItem }>();
    });

    it('should key store data by uuid, not by numeric id', () => {
      const store = getOrCreate('items', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { getList: true },
      });

      const items: UuidKeyItem[] = [
        { id: 1, uuid: 'u1', name: 'Item A' },
        { id: 2, uuid: 'u2', name: 'Item B' },
      ];
      store.getState().setList(items);

      const data = store.getState().data!;
      expect(data.get('u1')).toEqual(items[0]);
      expect(data.get('u2')).toEqual(items[1]);
      // NOT keyed by numeric id
      expect(data.get('1')).toBeUndefined();
      expect(data.get('2')).toBeUndefined();
    });

    it('should setInstance/updateInstance/deleteInstance by uuid', () => {
      const store = getOrCreate('items_crud', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { get: true, create: true, update: true, delete: true },
      });

      const item: UuidKeyItem = { id: 1, uuid: 'u1', name: 'Item A' };
      store.getState().setInstance(item);
      expect(store.getState().data!.get('u1')).toEqual(item);

      store.getState().updateInstance({ id: 1, uuid: 'u1', name: 'Updated A' });
      expect(store.getState().data!.get('u1')!.name).toBe('Updated A');

      store.getState().deleteInstance({ id: 1, uuid: 'u1', name: '' });
      expect(store.getState().data!.get('u1')).toBeUndefined();
    });

    it('should patchList by uuid', () => {
      const store = getOrCreate('items_patch', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { getList: true },
      });

      store.getState().setList([
        { id: 1, uuid: 'u1', name: 'Item A' },
        { id: 2, uuid: 'u2', name: 'Item B' },
      ]);

      store.getState().patchList([{ id: 1, uuid: 'u1', name: 'Patched A' }]);

      expect(store.getState().data!.get('u1')!.name).toBe('Patched A');
      expect(store.getState().data!.get('u2')!.name).toBe('Item B');
    });

    it('should use uuid for detail routes (detailKey defaults to id)', () => {
      const store = getOrCreate('items_route', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { get: true },
      });

      const routeFn = store.config.actions.get.route;
      // detailKey defaults to id ('uuid'), so routes use uuid
      expect((routeFn as Function)({ id: 42, uuid: 'u1' }, { args: undefined, params: undefined }))
        .toBe('/items/u1');
    });

    it('should select/toggle by uuid', () => {
      const store = getOrCreate('items_select', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { getList: true },
        select: 'multiple',
      });

      const items: UuidKeyItem[] = [
        { id: 1, uuid: 'u1', name: 'Item A' },
        { id: 2, uuid: 'u2', name: 'Item B' },
        { id: 3, uuid: 'u3', name: 'Item C' },
      ];
      store.getState().setList(items);

      const { result } = renderHook(() => useCrud(store));

      act(() => { result.current.toggle(items[0]); });
      act(() => { result.current.toggle(items[2]); });
      expect(result.current.selected).toEqual([items[0], items[2]]);
      expect(store.getState().selectedIds).toEqual(['u1', 'u3']);

      // Select by raw uuid string
      act(() => { result.current.clear(); });
      act(() => { result.current.select('u2'); });
      expect(store.getState().selectedIds).toEqual(['u2']);
    });

    it('should delete by uuid and clean up selectedIds', () => {
      const store = getOrCreate('items_delete_select', {
        axios: mockAxios as any,
        route: '/items',
        id: 'uuid',
        actions: { getList: true },
        select: 'multiple',
      });

      store.getState().setList([
        { id: 1, uuid: 'u1', name: 'Item A' },
        { id: 2, uuid: 'u2', name: 'Item B' },
      ]);
      store.getState().setSelectedIds(['u1', 'u2']);

      store.getState().deleteInstance({ id: 1, uuid: 'u1', name: '' });

      expect(store.getState().data!.get('u1')).toBeUndefined();
      expect(store.getState().selectedIds).toEqual(['u2']);
    });

    describe('useCrud lookup when id === detailKey (both uuid)', () => {
      // detailKey defaults to id ('uuid'), so both are uuid. Direct Map lookup.

      it('default — resolves by uuid (Map key)', () => {
        const store = getOrCreate('items_lookup_ok', {
          axios: mockAxios as any,
          route: '/items',
          id: 'uuid',
          actions: { get: true, getList: true },
        });

        store.getState().setList([{ id: 1, uuid: 'u1', name: 'Item A' }]);

        // Default by: detailKey ('uuid'). id === detailKey → Map.get('u1')
        const { result } = renderHook(() => useCrud(store, 'u1'));

        expect(result.current.instance).toEqual({ id: 1, uuid: 'u1', name: 'Item A' });
      });

      it('auto-fetch sends { uuid: value } and builds correct route', async () => {
        const mockAxiosFn = jest.fn().mockResolvedValueOnce({
          data: { id: 1, uuid: 'u1', name: 'Fetched' },
        });
        Object.assign(mockAxiosFn, mockAxios);

        const store = getOrCreate('items_autofetch_uuid', {
          axios: mockAxiosFn as any,
          route: '/items',
          id: 'uuid',
          actions: { get: true, getList: true },
        });

        renderHook(() => useCrud(store, 'u1'));

        await act(async () => {
          await new Promise((r) => setTimeout(r, 0));
        });

        // Auto-fetch sends { uuid: 'u1' }, route reads data.uuid → /items/u1
        expect(mockAxiosFn).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/items/u1',
          }),
        );
      });
    });
  });

  // ── Both different (detailKey: 'slug', id: 'uuid') ────────────────────
  // Routes use slug (what's in the URL). Store keyed by uuid (stable).
  // Loading state tracks slug value (config.detailKey).

  describe('both detailKey and id different (detailKey: "slug", id: "uuid")', () => {
    let getOrCreate: ReturnType<typeof createStoreRegistry<{ items: DualKeyItem }>>;

    beforeEach(() => {
      getOrCreate = createStoreRegistry<{ items: DualKeyItem }>();
    });

    it('should key store by uuid, build detail route with slug', () => {
      const store = getOrCreate('items', {
        axios: mockAxios as any,
        route: '/items',
        detailKey: 'slug',
        id: 'uuid',
        actions: { get: true, getList: true },
      });

      const items: DualKeyItem[] = [
        { uuid: 'u1', slug: 'item-a', name: 'Item A' },
        { uuid: 'u2', slug: 'item-b', name: 'Item B' },
      ];
      store.getState().setList(items);

      // Store keyed by uuid (config.id)
      expect(store.getState().data!.get('u1')).toEqual(items[0]);
      expect(store.getState().data!.get('item-a')).toBeUndefined();

      // Route uses slug (config.detailKey)
      const routeFn = store.config.actions.get.route;
      expect((routeFn as Function)({ uuid: 'u1', slug: 'item-a' }, { args: undefined, params: undefined }))
        .toBe('/items/item-a');
    });

    it('should track slug in loading state on update', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({
        data: { uuid: 'u1', slug: 'item-a', name: 'Updated' },
      });
      Object.assign(mockAxiosFn, mockAxios);

      const store = getOrCreate('items_loading', {
        axios: mockAxiosFn as any,
        route: '/items',
        detailKey: 'slug',
        id: 'uuid',
        actions: { update: true, getList: true },
      });

      store.getState().setList([{ uuid: 'u1', slug: 'item-a', name: 'Original' }]);

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.update({ uuid: 'u1', slug: 'item-a', name: 'Updated' });
      });

      // Loading state id is slug (config.detailKey), not uuid (config.id)
      expect(result.current.update.id).toBe('item-a');
    });

    it('should track slug in loading state on delete', async () => {
      const mockAxiosFn = jest.fn().mockResolvedValueOnce({ data: {} });
      Object.assign(mockAxiosFn, mockAxios);

      const store = getOrCreate('items_delete_loading', {
        axios: mockAxiosFn as any,
        route: '/items',
        detailKey: 'slug',
        id: 'uuid',
        actions: { delete: true, getList: true },
      });

      store.getState().setList([{ uuid: 'u1', slug: 'item-a', name: 'Item A' }]);

      const { result } = renderHook(() => useCrud(store));

      await act(async () => {
        await result.current.delete({ uuid: 'u1', slug: 'item-a' });
      });

      expect(result.current.delete.id).toBe('item-a');
    });

    it('should select by uuid (config.id), not slug', () => {
      const store = getOrCreate('items_select', {
        axios: mockAxios as any,
        route: '/items',
        detailKey: 'slug',
        id: 'uuid',
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
      expect(store.getState().selectedIds).toEqual(['u1']); // uuid, not slug

      act(() => { result.current.select('u2'); });
      expect(result.current.selected).toEqual(items[1]);
    });

    it('should delete by uuid and clean up selectedIds by uuid', () => {
      const store = getOrCreate('items_delete_select', {
        axios: mockAxios as any,
        route: '/items',
        detailKey: 'slug',
        id: 'uuid',
        actions: { getList: true },
        select: 'multiple',
      });

      store.getState().setList([
        { uuid: 'u1', slug: 'item-a', name: 'Item A' },
        { uuid: 'u2', slug: 'item-b', name: 'Item B' },
      ]);
      store.getState().setSelectedIds(['u1', 'u2']);

      store.getState().deleteInstance({ uuid: 'u1', slug: 'item-a', name: '' });

      expect(store.getState().data!.get('u1')).toBeUndefined();
      expect(store.getState().selectedIds).toEqual(['u2']);
    });

    it('useCrud(store, slug) should find instance (default by: detailKey)', () => {
      const store = getOrCreate('items_lookup_ok', {
        axios: mockAxios as any,
        route: '/items',
        detailKey: 'slug',
        id: 'uuid',
        actions: { get: true, getList: true },
      });

      store.getState().setList([{ uuid: 'u1', slug: 'item-a', name: 'Item A' }]);

      // Default by: detailKey ('slug') — scans item.slug, finds match
      const { result } = renderHook(() => useCrud(store, 'item-a'));
      expect(result.current.instance).toEqual({ uuid: 'u1', slug: 'item-a', name: 'Item A' });
    });

    it('useCrud(store, uuid, { by: uuid }) should find instance by Map key', () => {
      const store = getOrCreate('items_lookup_by_uuid', {
        axios: mockAxios as any,
        route: '/items',
        detailKey: 'slug',
        id: 'uuid',
        actions: { get: true, getList: true },
      });

      store.getState().setList([{ uuid: 'u1', slug: 'item-a', name: 'Item A' }]);

      // Explicit by: 'uuid' — direct Map lookup
      const { result } = renderHook(() => useCrud(store, 'u1', { by: 'uuid' }));
      expect(result.current.instance).toEqual({ uuid: 'u1', slug: 'item-a', name: 'Item A' });
    });

    it('auto-fetch skipped when by !== detailKey (can\'t build route from uuid)', async () => {
      const mockAxiosFn = jest.fn();
      Object.assign(mockAxiosFn, mockAxios);

      const store = getOrCreate('items_autofetch', {
        axios: mockAxiosFn as any,
        route: '/items',
        detailKey: 'slug',
        id: 'uuid',
        actions: { get: true, getList: true },
      });

      // Instance not in store, by: 'uuid' !== detailKey 'slug'
      renderHook(() => useCrud(store, 'u1', { by: 'uuid' }));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      // No fetch — can't build correct route from a uuid value
      expect(mockAxiosFn).not.toHaveBeenCalled();
    });
  });

  // ── Update with original (slug rename) ──────────────────────────────
  // When detailKey is mutable (slug), update route should use the OLD
  // value from the Map, not the new value from the update payload.

  describe('update with original (slug rename)', () => {
    // Type with both stable id and mutable slug
    interface SlugIdItem {
      id: number;
      slug: string;
      name: string;
    }

    const makeMockAxios = (response: any) => {
      const fn = jest.fn().mockResolvedValueOnce({ data: response });
      Object.assign(fn, mockAxios);
      return fn as any;
    };

    describe('basic: detailKey: "slug", id: "id" (mutable detailKey, stable Map key)', () => {
      it('update route uses old slug when slug changes', async () => {
        const mockAxiosFn = makeMockAxios({ id: 42, slug: 'new-slug', name: 'New' });

        const getOrCreate = createStoreRegistry<{ items: SlugIdItem }>();
        const store = getOrCreate('items_update_rename', {
          axios: mockAxiosFn,
          route: '/items',
          detailKey: 'slug',
          id: 'id',
          actions: { update: true, getList: true },
        });

        store.getState().setList([{ id: 42, slug: 'old-slug', name: 'Old' }]);

        const { result } = renderHook(() => useCrud(store));

        await act(async () => {
          await result.current.update({ id: 42, slug: 'new-slug', name: 'New' });
        });

        // Route uses OLD slug from the Map instance
        expect(mockAxiosFn).toHaveBeenCalledWith(
          expect.objectContaining({
            url: '/items/old-slug',
          }),
        );
        // Body contains the NEW slug
        expect(mockAxiosFn).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { id: 42, slug: 'new-slug', name: 'New' },
          }),
        );
      });

      it('update stores response by id (Map key), not slug', async () => {
        const mockAxiosFn = makeMockAxios({ id: 42, slug: 'new-slug', name: 'New' });

        const getOrCreate = createStoreRegistry<{ items: SlugIdItem }>();
        const store = getOrCreate('items_update_store', {
          axios: mockAxiosFn,
          route: '/items',
          detailKey: 'slug',
          id: 'id',
          actions: { update: true, getList: true },
        });

        store.getState().setList([{ id: 42, slug: 'old-slug', name: 'Old' }]);

        const { result } = renderHook(() => useCrud(store));

        await act(async () => {
          await result.current.update({ id: 42, slug: 'new-slug', name: 'New' });
        });

        // Stored by id (Map key)
        expect(store.getState().data!.get('42')).toEqual({ id: 42, slug: 'new-slug', name: 'New' });
        // NOT stored by slug
        expect(store.getState().data!.get('old-slug')).toBeUndefined();
        expect(store.getState().data!.get('new-slug')).toBeUndefined();
      });

      it('update with no slug change — route uses current slug', async () => {
        const mockAxiosFn = makeMockAxios({ id: 42, slug: 'my-slug', name: 'New' });

        const getOrCreate = createStoreRegistry<{ items: SlugIdItem }>();
        const store = getOrCreate('items_update_same', {
          axios: mockAxiosFn,
          route: '/items',
          detailKey: 'slug',
          id: 'id',
          actions: { update: true, getList: true },
        });

        store.getState().setList([{ id: 42, slug: 'my-slug', name: 'Old' }]);

        const { result } = renderHook(() => useCrud(store));

        await act(async () => {
          await result.current.update({ id: 42, slug: 'my-slug', name: 'New' });
        });

        expect(mockAxiosFn).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/items/my-slug' }),
        );
      });

      it('update when instance not in Map — falls back to data', async () => {
        const mockAxiosFn = makeMockAxios({ id: 99, slug: 'new-item', name: 'New' });

        const getOrCreate = createStoreRegistry<{ items: SlugIdItem }>();
        const store = getOrCreate('items_update_missing', {
          axios: mockAxiosFn,
          route: '/items',
          detailKey: 'slug',
          id: 'id',
          actions: { update: true, getList: true },
        });

        // Map is empty — no original to find
        const { result } = renderHook(() => useCrud(store));

        await act(async () => {
          await result.current.update({ id: 99, slug: 'new-item', name: 'New' });
        });

        // Falls back to data — uses new slug in route
        expect(mockAxiosFn).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/items/new-item' }),
        );
      });
    });

    describe('edge case: detailKey === id (id: "slug", detailKey defaults to "slug")', () => {
      it('update route uses data directly — cannot find original after slug change', async () => {
        const mockAxiosFn = makeMockAxios({ slug: 'new-slug', name: 'New' });

        type SlugOnlyItem = { slug: string; name: string };
        const getOrCreate = createStoreRegistry<{ items: SlugOnlyItem }>();
        const store = getOrCreate('items_update_same_key', {
          axios: mockAxiosFn,
          route: '/items',
          id: 'slug',
          // detailKey defaults to 'slug' — Map keyed by slug
          actions: { update: true, getList: true },
        });

        store.getState().setList([{ slug: 'old-slug', name: 'Old' }]);

        const { result } = renderHook(() => useCrud(store));

        await act(async () => {
          await result.current.update({ slug: 'new-slug', name: 'New' });
        });

        // Map is keyed by slug. Lookup: data.get('new-slug') → undefined (Map has 'old-slug').
        // Original not found — route uses data (new slug).
        // This is expected when using a mutable field as both Map key and route key.
        expect(mockAxiosFn).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/items/new-slug' }),
        );
      });
    });

    describe('edge case: function route', () => {
      it('function route receives data as first arg, original in options', async () => {
        const routeFn = jest.fn(
          (data: any, { original }: any) => `/items/${original?.slug ?? data.slug}`
        );
        const mockAxiosFn = makeMockAxios({ id: 42, slug: 'new-slug', name: 'New' });

        const getOrCreate = createStoreRegistry<{ items: SlugIdItem }>();
        const store = getOrCreate('items_update_fn_route', {
          axios: mockAxiosFn,
          route: '/items',
          detailKey: 'slug',
          id: 'id',
          actions: { update: { route: routeFn } },
        });

        store.getState().setList([{ id: 42, slug: 'old-slug', name: 'Old' }]);

        const { result } = renderHook(() => useCrud(store));

        await act(async () => {
          await result.current.update({ id: 42, slug: 'new-slug', name: 'New' });
        });

        // First arg is data (new values)
        expect(routeFn.mock.calls[0][0]).toEqual({ id: 42, slug: 'new-slug', name: 'New' });
        // Second arg options contains original (old instance)
        expect(routeFn.mock.calls[0][1].original).toEqual({ id: 42, slug: 'old-slug', name: 'Old' });
        // args and params are still passed through
        expect(routeFn.mock.calls[0][1]).toHaveProperty('args');
        expect(routeFn.mock.calls[0][1]).toHaveProperty('params');
        // URL built by the user's function using original
        expect(mockAxiosFn).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/items/old-slug' }),
        );
      });

      it('function route without using original — works like before', async () => {
        const routeFn = jest.fn((data: any) => `/items/${data.slug}`);
        const mockAxiosFn = makeMockAxios({ id: 42, slug: 'new-slug', name: 'New' });

        const getOrCreate = createStoreRegistry<{ items: SlugIdItem }>();
        const store = getOrCreate('items_update_fn_no_orig', {
          axios: mockAxiosFn,
          route: '/items',
          detailKey: 'slug',
          id: 'id',
          actions: { update: { route: routeFn } },
        });

        store.getState().setList([{ id: 42, slug: 'old-slug', name: 'Old' }]);

        const { result } = renderHook(() => useCrud(store));

        await act(async () => {
          await result.current.update({ id: 42, slug: 'new-slug', name: 'New' });
        });

        // User's function uses data.slug (new value) — their choice
        expect(mockAxiosFn).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/items/new-slug' }),
        );
      });
    });

    describe('edge case: prepare + original', () => {
      it('prepare transforms body but string route still uses original', async () => {
        const mockAxiosFn = makeMockAxios({ id: 42, slug: 'new-slug', name: 'New' });

        const getOrCreate = createStoreRegistry<{ items: SlugIdItem }>();
        const store = getOrCreate('items_update_prepare', {
          axios: mockAxiosFn,
          route: '/items',
          detailKey: 'slug',
          id: 'id',
          actions: {
            update: {
              prepare: (data: any) => ({ name: data.name }),
            },
            getList: true,
          },
        });

        store.getState().setList([{ id: 42, slug: 'old-slug', name: 'Old' }]);

        const { result } = renderHook(() => useCrud(store));

        await act(async () => {
          await result.current.update({ id: 42, slug: 'new-slug', name: 'New' });
        });

        // String route uses original (old slug)
        expect(mockAxiosFn).toHaveBeenCalledWith(
          expect.objectContaining({ url: '/items/old-slug' }),
        );
        // Body uses prepare(data) — slug stripped
        expect(mockAxiosFn).toHaveBeenCalledWith(
          expect.objectContaining({ data: { name: 'New' } }),
        );
      });
    });
  });
});
