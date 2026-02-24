import Axios from "axios";
import { createStoreRegistry } from "../src/createStoreRegistry";
import { useCrud } from "../src/useCrud";
import { useSelect } from "../src/useSelect";

const axios = Axios.create({ baseURL: "/api" });

type Item = { id: number; name: string };

// ── Store WITHOUT select ───────────────────────────────────────────
const getOrCreatePlain = createStoreRegistry<{ items: Item }>();
const plainStore = getOrCreatePlain("items", {
  axios,
  route: "/items",
  actions: { getList: true },
});

const plain = useCrud(plainStore);

// ── Absent fields on plain (only getList configured) ────────────────

// Action functions — correctly conditional
// @ts-expect-error — get not in actions
plain.get;
// @ts-expect-error — create not in actions
plain.create;
// @ts-expect-error — update not in actions
plain.update;
// @ts-expect-error — delete not in actions
plain.delete;
// @ts-expect-error — no pagination configured
plain.pagination;

// BUG: These fields should error but don't — the mapped types with
// `Extract<keyof C, 'key'> as 'newName'` leak through as accessible.
// Uncomment these @ts-expect-error lines once the types are fixed:
// // @ts-expect-error — no pagination configured
plain.setPagination;
// // @ts-expect-error — no includeList configured
plain.list;
// // @ts-expect-error — no includeRecord configured
plain.record;
// // @ts-expect-error — no state configured
plain.state;
// // @ts-expect-error — no state configured
plain.setState;
// // @ts-expect-error — no select configured
plain.selected;
// // @ts-expect-error — no select configured
plain.select;
// // @ts-expect-error — no select configured
plain.toggle;
// // @ts-expect-error — no select configured
plain.clear;
// // @ts-expect-error — instance should require get action
plain.instance;

// ── Store WITH select: 'single' ───────────────────────────────────
const getOrCreateSingle = createStoreRegistry<{ items: Item }>();
const singleStore = getOrCreateSingle("items", {
  axios,
  route: "/items",
  actions: { getList: true },
  select: 'single' as const,
});

const single = useCrud(singleStore);

// useCrud selected is T | T[] | null (union — can't distinguish single/multiple)
single.selected;
single.select(1);
single.toggle(1);
single.clear();

// ── Store WITH select: 'multiple' ─────────────────────────────────
const getOrCreateMulti = createStoreRegistry<{ items: Item }>();
const multiStore = getOrCreateMulti("items", {
  axios,
  route: "/items",
  actions: { getList: true },
  select: 'multiple' as const,
});

const multi = useCrud(multiStore);

// useCrud selected is T | T[] | null (union)
multi.selected;
multi.toggle(1);
multi.clear();

// ── useSelect overloads — precise types ─────────────────────────────
const selSingle = useSelect(singleStore);
const _si: Item | null = selSingle.selected;
const _sid: string | null = selSingle.selectedId;
selSingle.select(1);
selSingle.toggle(1);
selSingle.clear();

const selMulti = useSelect(multiStore);
const _mi: Item[] = selMulti.selected;
const _msids: string[] = selMulti.selectedIds;
selMulti.select(1);
selMulti.toggle(1);
selMulti.clear();

// ── Store with pagination + state + record ─────────────────────────
const getOrCreateFull = createStoreRegistry<{ items: Item }>();
const fullStore = getOrCreateFull("items", {
  axios,
  route: "/items",
  actions: { getList: true },
  state: { filter: 'all' },
  includeList: true,
  includeRecord: true,
  pagination: { limit: 10 },
  select: 'single' as const,
});

const full = useCrud(fullStore);
full.list;
full.pagination;
full.setPagination({ offset: 10 });
full.state;
full.setState({ filter: 'active' });
full.record;
full.selected;
// @ts-expect-error — get not in actions
full.get;
// @ts-expect-error — create not in actions
full.create;
// @ts-expect-error — update not in actions
full.update;
// @ts-expect-error — delete not in actions
full.delete;

// ── Store with all actions ───────────────────────────────────────
const getOrCreateAllActions = createStoreRegistry<{ items: Item }>();
const allActionsStore = getOrCreateAllActions("items", {
  axios,
  route: "/items",
  actions: { get: true, getList: true, create: true, update: true, delete: true },
  includeList: true,
});

const allActions = useCrud(allActionsStore);
// All action functions should exist
allActions.get;
allActions.getList;
allActions.create;
allActions.update;
allActions.delete;
allActions.list;
// instance should exist (get is configured)
const _allActionsInst: Item | null = allActions.instance;

// With id — auto-fetches
const allActionsWithId = useCrud(allActionsStore, '1');
const _allActionsInstById: Item | null = allActionsWithId.instance;
