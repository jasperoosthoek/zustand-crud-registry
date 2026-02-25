import Axios from "axios";
import { createStoreRegistry } from "../src/createStoreRegistry";
import type {
  GetConfig,
  GetListConfig,
  CreateConfig,
  UpdateConfig,
  DeleteConfig,
  PaginationConfig,
  CustomActionConfig,
  OnError,
  Route,
} from "../src/config";

const axios = Axios.create({ baseURL: "/api" });
type Item = { id: number; name: string };

// ── Registry key constraint ────────────────────────────────────────
const getOrCreate = createStoreRegistry<{ items: Item }>();

// Valid key
getOrCreate("items", { axios, route: "/items", actions: { getList: true } });

// @ts-expect-error — 'invalid' is not a model key
getOrCreate("invalid", { axios, route: "/x", actions: { getList: true } });

// ── Action resolution: partial config ──────────────────────────────
const registry1 = createStoreRegistry<{ items: Item }>();
const partialStore = registry1("items", {
  axios,
  route: "/items",
  actions: { getList: true, get: true },
});

// Configured actions resolve to full config types
const _getListCfg: GetListConfig<Item> = partialStore.config.actions.getList;
const _getCfg: GetConfig<Item> = partialStore.config.actions.get;

// Unconfigured actions don't exist on the type
// @ts-expect-error — create not configured
partialStore.config.actions.create;
// @ts-expect-error — update not configured
partialStore.config.actions.update;
// @ts-expect-error — delete not configured
partialStore.config.actions.delete;

// ── Action resolution: all actions ─────────────────────────────────
const registry2 = createStoreRegistry<{ items: Item }>();
const allStore = registry2("items", {
  axios,
  route: "/items",
  actions: { get: true, getList: true, create: true, update: true, delete: true },
});

const _allGet: GetConfig<Item> = allStore.config.actions.get;
const _allGetList: GetListConfig<Item> = allStore.config.actions.getList;
const _allCreate: CreateConfig<Item> = allStore.config.actions.create;
const _allUpdate: UpdateConfig<Item> = allStore.config.actions.update;
const _allDelete: DeleteConfig<Item> = allStore.config.actions.delete;

// ── State type preservation ────────────────────────────────────────
const registry3 = createStoreRegistry<{ items: Item }>();
const stateStore = registry3("items", {
  axios,
  route: "/items",
  actions: { getList: true },
  state: { filter: 'all' as const, page: 1, active: true },
});

// State preserves literal types from config
const _filter: "all" = stateStore.config.state.filter;
const _page: number = stateStore.config.state.page;
const _active: boolean = stateStore.config.state.active;

// ── Custom actions: key preservation ───────────────────────────────
const registry4 = createStoreRegistry<{ items: Item }>();
const customStore = registry4("items", {
  axios,
  route: "/items",
  actions: { getList: true },
  customActions: {
    archive: { route: '/items/archive', method: 'post' },
    restore: { route: '/items/restore' },
  },
});

// Configured custom actions exist with correct type
const _archiveCfg: CustomActionConfig<Item> = customStore.config.customActions.archive;
const _restoreCfg: CustomActionConfig<Item> = customStore.config.customActions.restore;

// ── Pagination config type ─────────────────────────────────────────
const registry5 = createStoreRegistry<{ items: Item }>();
const paginatedStore = registry5("items", {
  axios,
  route: "/items",
  actions: { getList: true },
  pagination: { limit: 10 },
});

// Pagination normalizes to PaginationConfig | null in ValidatedConfig
const _paginationCfg: PaginationConfig | null = paginatedStore.config.pagination;

// ── Config scalar fields ───────────────────────────────────────────
const _detailKey: string = partialStore.config.detailKey;
const _id: string = partialStore.config.id;
const _includeList: boolean = partialStore.config.includeList;
const _includeRecord: boolean = partialStore.config.includeRecord;
const _select: 'single' | 'multiple' | null = partialStore.config.select;
const _route: Route = partialStore.config.route;
const _onError: OnError | null = partialStore.config.onError;
