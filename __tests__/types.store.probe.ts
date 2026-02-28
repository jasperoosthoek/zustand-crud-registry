import Axios from "axios";
import { createStoreRegistry } from "../src/createStoreRegistry";
import type { Pagination, Route } from "../src/config";
import type { LoadingStateValue } from "../src/loadingState";

const axios = Axios.create({ baseURL: "/api" });
type Item = { id: number; name: string };

const registry = createStoreRegistry<{ items: Item }>();
const store = registry("items", {
  axios,
  route: "/items",
  actions: { getList: true, get: true },
  state: { filter: 'all' as const },
  pagination: { limit: 10 },
});

// ── Branded properties ─────────────────────────────────────────────

// store.key is the literal key type, not just string
const _key: 'items' = store.key;

// store.config is ValidatedConfig — action resolution works
store.config.actions.getList;
store.config.actions.get;
// @ts-expect-error — create not configured
store.config.actions.create;

// store.config scalar fields
const _configDetailKey: string = store.config.detailKey;
const _configId: string = store.config.id;

// store.rawConfig preserves original config type
const _rawRoute: Route = store.rawConfig.route;

// ── Store as Zustand hook ──────────────────────────────────────────

// Callable with selector — data is Map<string, T> | null
const _data: Map<string, Item> | null = store((s) => s.data);
const _loadingState: { [key: string]: LoadingStateValue } = store((s) => s.loadingState);
const _pagination: Pagination | null = store((s) => s.pagination);
const _selectedIds: string[] = store((s) => s.selectedIds);

// ── getState() — CrudState mutation functions ──────────────────────
const state = store.getState();

// Data operations — typed with the model type T
const _setList: (data: Item[] | null) => void = state.setList;
const _patchList: (data: Partial<Item>[]) => void = state.patchList;
const _updateList: (data: Item[]) => void = state.updateList;
const _setInstance: (instance: Item) => void = state.setInstance;
const _updateInstance: (instance: Item) => void = state.updateInstance;
const _deleteInstance: (instance: Item) => void = state.deleteInstance;

// Loading state
const _setLoadingState: (key: string, value: Partial<LoadingStateValue>) => void = state.setLoadingState;

// Pagination
const _setPagination: (partial: Partial<Pagination>) => void = state.setPagination;

// Selection
const _setSelectedIds: (ids: string[]) => void = state.setSelectedIds;

// ── Direct store methods (no getState() needed) ─────────────────────
const _directSetList: (data: Item[] | null) => void = store.setList;
const _directPatchList: (data: Partial<Item>[]) => void = store.patchList;
const _directUpdateList: (data: Item[]) => void = store.updateList;
const _directSetInstance: (instance: Item) => void = store.setInstance;
const _directUpdateInstance: (instance: Item) => void = store.updateInstance;
const _directDeleteInstance: (instance: Item) => void = store.deleteInstance;
const _directSetPagination: (partial: Partial<Pagination>) => void = store.setPagination;
const _directSetSelectedIds: (ids: string[]) => void = store.setSelectedIds;
