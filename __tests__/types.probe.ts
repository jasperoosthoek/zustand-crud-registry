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

// Pagination should not exist:
// @ts-expect-error — no pagination configured
plain.pagination;

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
