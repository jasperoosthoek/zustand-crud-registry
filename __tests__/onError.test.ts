import { createStoreRegistry } from '../src/createStoreRegistry';
import { useCrud } from '../src/useCrud';
import { renderHook, act } from '@testing-library/react';

const mockAxios = jest.fn();
Object.assign(mockAxios, {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(),
  defaults: {},
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
});

interface Item {
  id: number;
  name: string;
}

describe('config-level onError', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // ── Standard actions: config-level onError ─────────────────────────

  it('should call config-level onError when getList fails', async () => {
    const configOnError = jest.fn();
    const error = new Error('getList failed');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items', {
      axios: mockAxios as any,
      route: '/items',
      actions: { getList: true },
      onError: configOnError,
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.getList();
    });

    expect(configOnError).toHaveBeenCalledTimes(1);
    expect(configOnError).toHaveBeenCalledWith(error);
  });

  it('should call config-level onError when create fails', async () => {
    const configOnError = jest.fn();
    const error = new Error('create failed');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-create', {
      axios: mockAxios as any,
      route: '/items',
      actions: { create: true },
      onError: configOnError,
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.create({ name: 'test' });
    });

    expect(configOnError).toHaveBeenCalledTimes(1);
    expect(configOnError).toHaveBeenCalledWith(error);
  });

  it('should call config-level onError when update fails', async () => {
    const configOnError = jest.fn();
    const error = new Error('update failed');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-update', {
      axios: mockAxios as any,
      route: '/items',
      actions: { update: true },
      onError: configOnError,
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.update({ id: 1, name: 'test' });
    });

    expect(configOnError).toHaveBeenCalledTimes(1);
    expect(configOnError).toHaveBeenCalledWith(error);
  });

  it('should call config-level onError when delete fails', async () => {
    const configOnError = jest.fn();
    const error = new Error('delete failed');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-delete', {
      axios: mockAxios as any,
      route: '/items',
      actions: { delete: true },
      onError: configOnError,
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.delete({ id: 1, name: 'test' });
    });

    expect(configOnError).toHaveBeenCalledTimes(1);
    expect(configOnError).toHaveBeenCalledWith(error);
  });

  // ── Action-level override beats config-level ───────────────────────

  it('should call action-level onError override instead of config-level', async () => {
    const configOnError = jest.fn();
    const actionOnError = jest.fn();
    const error = new Error('create failed');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-action-override', {
      axios: mockAxios as any,
      route: '/items',
      actions: { create: { onError: actionOnError } },
      onError: configOnError,
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.create({ name: 'test' });
    });

    expect(actionOnError).toHaveBeenCalledTimes(1);
    expect(actionOnError).toHaveBeenCalledWith(error);
    expect(configOnError).not.toHaveBeenCalled();
  });

  // ── Both config-level and caller-level are called ──────────────────

  it('should call both config-level and caller-level onError', async () => {
    const configOnError = jest.fn();
    const callerOnError = jest.fn();
    const error = new Error('getList failed');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-both', {
      axios: mockAxios as any,
      route: '/items',
      actions: { getList: true },
      onError: configOnError,
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.getList({ onError: callerOnError });
    });

    expect(configOnError).toHaveBeenCalledTimes(1);
    expect(configOnError).toHaveBeenCalledWith(error);
    expect(callerOnError).toHaveBeenCalledTimes(1);
    expect(callerOnError).toHaveBeenCalledWith(error);
  });

  // ── Custom actions ─────────────────────────────────────────────────

  it('should call config-level onError when custom action fails (no action override)', async () => {
    const configOnError = jest.fn();
    const error = new Error('archive failed');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-custom-fallback', {
      axios: mockAxios as any,
      route: '/items',
      actions: { getList: true },
      onError: configOnError,
      customActions: {
        archive: { route: '/items/archive' },
      },
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.archive();
    });

    expect(configOnError).toHaveBeenCalledTimes(1);
    expect(configOnError).toHaveBeenCalledWith(error);
  });

  it('should call custom action onError override instead of config-level', async () => {
    const configOnError = jest.fn();
    const customOnError = jest.fn();
    const error = new Error('archive failed');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-custom-override', {
      axios: mockAxios as any,
      route: '/items',
      actions: { getList: true },
      onError: configOnError,
      customActions: {
        archive: { route: '/items/archive', onError: customOnError },
      },
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.archive();
    });

    expect(customOnError).toHaveBeenCalledTimes(1);
    expect(customOnError).toHaveBeenCalledWith(error);
    expect(configOnError).not.toHaveBeenCalled();
  });

  it('should call both custom action onError and caller-level onError', async () => {
    const customOnError = jest.fn();
    const callerOnError = jest.fn();
    const error = new Error('archive failed');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-custom-both', {
      axios: mockAxios as any,
      route: '/items',
      actions: { getList: true },
      customActions: {
        archive: { route: '/items/archive', onError: customOnError },
      },
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.archive(null, { onError: callerOnError });
    });

    expect(customOnError).toHaveBeenCalledTimes(1);
    expect(callerOnError).toHaveBeenCalledTimes(1);
  });

  // ── No onError at any level ────────────────────────────────────────

  it('should not crash when no onError is configured anywhere', async () => {
    const error = new Error('getList failed');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-no-handler', {
      axios: mockAxios as any,
      route: '/items',
      actions: { getList: true },
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.getList();
    });

    // Should still set error state on loading state
    expect(result.current.getList.error).toBe(error);
    expect(result.current.getList.isLoading).toBe(false);
  });

  // ── Conditional console.error ────────────────────────────────────

  it('should not console.error when config-level onError is set', async () => {
    const error = new Error('handled error');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-no-console-config', {
      axios: mockAxios as any,
      route: '/items',
      actions: { getList: true },
      onError: jest.fn(),
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.getList();
    });

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should not console.error when caller-level onError is set', async () => {
    const error = new Error('handled error');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-no-console-caller', {
      axios: mockAxios as any,
      route: '/items',
      actions: { getList: true },
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.getList({ onError: jest.fn() });
    });

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should not console.error when both config and caller onError are set', async () => {
    const error = new Error('handled error');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-no-console-both', {
      axios: mockAxios as any,
      route: '/items',
      actions: { getList: true },
      onError: jest.fn(),
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.getList({ onError: jest.fn() });
    });

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should console.error when no onError handler is configured', async () => {
    const error = new Error('unhandled error');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-console-fallback', {
      axios: mockAxios as any,
      route: '/items',
      actions: { getList: true },
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.getList();
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(error);
  });

  it('should not console.error when custom action has onError', async () => {
    const error = new Error('handled custom error');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-no-console-custom', {
      axios: mockAxios as any,
      route: '/items',
      actions: { getList: true },
      customActions: {
        archive: { route: '/items/archive', onError: jest.fn() },
      },
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.archive();
    });

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  // ── Error state is written to correct key ──────────────────────────

  it('should write error to the custom action name, not "custom"', async () => {
    const error = new Error('archive failed');
    mockAxios.mockRejectedValueOnce(error);

    const getOrCreate = createStoreRegistry<{ items: Item }>();
    const store = getOrCreate('items-error-key', {
      axios: mockAxios as any,
      route: '/items',
      actions: { getList: true },
      customActions: {
        archive: { route: '/items/archive' },
      },
    });

    const { result } = renderHook(() => useCrud(store));

    await act(async () => {
      await result.current.archive();
    });

    // Error should be on 'archive' key, not 'custom'
    expect(result.current.archive.error).toBe(error);
    expect(result.current.archive.isLoading).toBe(false);

    // The internal loadingState should use 'archive' as key
    const state = store.getState();
    expect(state.loadingState['archive']?.error).toBe(error);
    expect(state.loadingState['custom']).toBeUndefined();
  });
});
