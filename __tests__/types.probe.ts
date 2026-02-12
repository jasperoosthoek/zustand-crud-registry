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

// With mapped types + as-cast, optional config keys may leak.
// The priority is Prettify flattening; strict exclusion is secondary.
plain.list;

// Pagination should also not exist:
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

// Single-select: selected.instance + selected.id
const _inst: Item | null = single.selected.instance;
const _id: string | null = single.selected.id;
single.select(1);
single.toggle(1);
single.clear();

// With as-cast approach, both single and multiple fields exist on selected
single.selected.instances;
single.selected.ids;

// ── Store WITH select: 'multiple' ─────────────────────────────────
const getOrCreateMulti = createStoreRegistry<{ items: Item }>();
const multiStore = getOrCreateMulti("items", {
  axios,
  route: "/items",
  actions: { getList: true },
  select: 'multiple' as const,
});

const multi = useCrud(multiStore);

// Multiple-select: selected.instances + selected.ids
const _items: Item[] = multi.selected.instances;
const _mids: string[] = multi.selected.ids;
multi.toggle(1);
multi.clear();

// With as-cast approach, both single and multiple fields exist on selected
multi.selected.instance;
multi.selected.id;

// ── useSelect overloads ────────────────────────────────────────────
const selSingle = useSelect(singleStore);
const _si: Item | null = selSingle.selected.instance;
const _sid: string | null = selSingle.selected.id;
// @ts-expect-error — instances only on multiple
selSingle.selected.instances;
// @ts-expect-error — ids only on multiple
selSingle.selected.ids;

const selMulti = useSelect(multiStore);
const _mi: Item[] = selMulti.selected.instances;
const _msids: string[] = selMulti.selected.ids;
// @ts-expect-error — instance only on single
selMulti.selected.instance;
// @ts-expect-error — id only on single
selMulti.selected.id;

// ── Store with pagination + state + record ─────────────────────────
const getOrCreateFull = createStoreRegistry<{ items: Item }>();
const fullStore = getOrCreateFull("items", {
  axios,
  route: "/items",
  actions: { getList: true },
  state: { filter: 'all' },
  includeRecord: true,
  pagination: { limit: 10 },
  select: 'single' as const,
});

const full = useCrud(fullStore);
full.pagination;
full.setPagination({ offset: 10 });
full.state;
full.setState({ filter: 'active' });
full.record;
full.selected.instance;
full.selected.id;
