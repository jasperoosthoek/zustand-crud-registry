import Axios from "axios";
import { createStoreRegistry } from "../src/createStoreRegistry";
import type { Pagination, Route } from "../src/config";
import type { LoadingStateValue } from "../src/loadingState";

const axios = Axios.create({ baseURL: "/api" });
type Item = { id: number; name: string };

// ── Full config: state + pagination + select ────────────────────────

const fullRegistry = createStoreRegistry<{ items: Item }>();
const store = fullRegistry("items", {
  axios,
  route: "/items",
  actions: { getList: true, get: true },
  state: { filter: 'all' as const },
  pagination: { limit: 10 },
  select: 'single' as const,
});

// ── Branded properties ─────────────────────────────────────────────

const _key: 'items' = store.key;
store.config.actions.getList;
store.config.actions.get;
// @ts-expect-error — create not configured
store.config.actions.create;
const _configDetailKey: string = store.config.detailKey;
const _configId: string = store.config.id;
const _rawRoute: Route = store.rawConfig.route;

// ── Selectors (internal full CrudState — always has all fields) ────

const _selData: Map<string, Item> | null = store((s) => s.data);
const _selLoadingState: { [key: string]: LoadingStateValue } = store((s) => s.loadingState);
const _selPagination: Pagination | null = store((s) => s.pagination);
const _selSelectedIds: string[] = store((s) => s.selectedIds);
const _selState: { filter: 'all' } = store((s) => s.state);

// ── getState() — conditional public type ───────────────────────────

const state = store.getState();

// Always present
const _gsData: Map<string, Item> | null = state.data;
const _gsLoadingState: { [key: string]: LoadingStateValue } = state.loadingState;
const _setList: (data: Item[] | null) => void = state.setList;
const _patchList: (data: Partial<Item>[]) => void = state.patchList;
const _updateList: (data: Item[]) => void = state.updateList;
const _setInstance: (instance: Item) => void = state.setInstance;
const _updateInstance: (instance: Item) => void = state.updateInstance;
const _deleteInstance: (instance: Item) => void = state.deleteInstance;
const _setLoadingState: (key: string, value: Partial<LoadingStateValue>) => void = state.setLoadingState;

// Conditional — present because configured
const _gsState: { filter: 'all' } = state.state;
const _gsPatchState: (subState: Partial<{ filter: 'all' }>) => void = state.patchState;
const _gsPagination: Pagination = state.pagination;
const _gsSetPagination: (partial: Partial<Pagination>) => void = state.setPagination;
const _gsSelectedIds: string[] = state.selectedIds;
const _gsSetSelectedIds: (ids: string[]) => void = state.setSelectedIds;

// ── Direct store methods ───────────────────────────────────────────

const _directSetList: (data: Item[] | null) => void = store.setList;
const _directPatchList: (data: Partial<Item>[]) => void = store.patchList;
const _directUpdateList: (data: Item[]) => void = store.updateList;
const _directSetInstance: (instance: Item) => void = store.setInstance;
const _directUpdateInstance: (instance: Item) => void = store.updateInstance;
const _directDeleteInstance: (instance: Item) => void = store.deleteInstance;
const _directPatchState: (subState: Partial<{ filter: 'all' }>) => void = store.patchState;
const _directSetPagination: (partial: Partial<Pagination>) => void = store.setPagination;
const _directSetSelectedIds: (ids: string[]) => void = store.setSelectedIds;

// ── Minimal config: no state, no pagination, no select ─────────────

const minRegistry = createStoreRegistry<{ items: Item }>();
const minStore = minRegistry("items", {
  axios,
  route: "/items",
  actions: { getList: true },
});

const minState = minStore.getState();

// Always present — still works
const _minData: Map<string, Item> | null = minState.data;
const _minLoadingState: { [key: string]: LoadingStateValue } = minState.loadingState;

// @ts-expect-error — state not configured
minState.state;
// @ts-expect-error — state not configured
minState.patchState;
// @ts-expect-error — pagination not configured
minState.pagination;
// @ts-expect-error — pagination not configured
minState.setPagination;
// @ts-expect-error — select not configured
minState.selectedIds;
// @ts-expect-error — select not configured
minState.setSelectedIds;

// Direct methods also conditional
// @ts-expect-error — state not configured
minStore.patchState;
// @ts-expect-error — pagination not configured
minStore.setPagination;
// @ts-expect-error — select not configured
minStore.setSelectedIds;
