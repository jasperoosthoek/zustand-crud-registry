import Axios from "axios";
import { createStoreRegistry } from "../src/createStoreRegistry";
import { useCrud, type UseCrudReturn } from "../src/useCrud";

const axios = Axios.create({ baseURL: "/api" });
type Item = { id: number; name: string };

// ── Store with all standard + custom actions ───────────────────────
const registry = createStoreRegistry<{ items: Item }>();
const store = registry("items", {
  axios,
  route: "/items",
  actions: { get: true, getList: true, create: true, update: true, delete: true },
  customActions: {
    archive: { route: '/items/archive', method: 'post' },
    restore: { route: '/items/restore', method: 'post' },
  },
});

const result = useCrud(store);

// ── Action return types ────────────────────────────────────────────

const _getReturn: Promise<Item | void> = result.get({ id: 1 });
const _getListReturn: Promise<Item[] | void> = result.getList();
const _createReturn: Promise<Item | void> = result.create({ name: 'test' });
const _updateReturn: Promise<Item | void> = result.update({ id: 1 });
const _deleteReturn: Promise<void> = result.delete({ id: 1 });

// ── Loading state on standard actions ──────────────────────────────

const _glIsLoading: boolean = result.getList.isLoading;
const _glError: any = result.getList.error;
const _glResponse: any = result.getList.response;
const _glId: string | number | null | undefined = result.getList.id;
const _glSequence: number = result.getList.sequence;

// Loading state accessible on all actions
const _gIsLoading: boolean = result.get.isLoading;
const _cIsLoading: boolean = result.create.isLoading;
const _uIsLoading: boolean = result.update.isLoading;
const _dIsLoading: boolean = result.delete.isLoading;

// onResponse is optional on action functions
const _glOnResponse: ((data: any) => void) | undefined = result.getList.onResponse;
const _gOnResponse: ((data: any) => void) | undefined = result.get.onResponse;

// ── Custom action functions ────────────────────────────────────────

// Custom actions are callable with optional args
const _archiveReturn: Promise<Item | void> = result.archive();
const _restoreReturn: Promise<Item | void> = result.restore('some-data');

// Custom actions have loading state
const _archiveIsLoading: boolean = result.archive.isLoading;
const _archiveError: any = result.archive.error;
const _archiveSequence: number = result.archive.sequence;
const _archiveOnResponse: ((data: any) => void) | undefined = result.archive.onResponse;

// ── Action call signatures ─────────────────────────────────────────

// get: (data: any, args?: AsyncFuncProps)
result.get({ id: 1 });
result.get({ id: 1 }, { callback: () => {} });

// getList: (args?: AsyncFuncProps)
result.getList();
result.getList({ params: { page: 1 } });

// create: (instance: Partial<Item>, args?: AsyncFuncProps)
result.create({});
result.create({ name: 'new' }, { callback: () => {} });

// update: (instance: Partial<Item>, args?: AsyncFuncProps)
result.update({ id: 1 });
result.update({ id: 1, name: 'changed' }, {});

// delete: (instance: Partial<Item>, args?: AsyncFuncProps)
result.delete({ id: 1 });
result.delete({ id: 1 }, { onError: () => {} });

// custom: (data?: any, args?: AsyncFuncProps)
result.archive();
result.archive({ id: 1 });
result.archive({ id: 1 }, { callback: () => {} });

// ── Typed custom action — data inferred from route function param ──

type Task = { id: number; status: string };

const typedRegistry = createStoreRegistry<{ tasks: Task }>();
const typedStore = typedRegistry("tasks", {
  axios,
  route: "/tasks",
  actions: { getList: true },
  customActions: {
    approve: {
      route: ({ id }: Task) => `/tasks/${id}/approve`,
      method: 'post',
    },
    simple: {
      route: '/tasks/simple',
    },
  },
});

const typed = useCrud(typedStore);

// Typed route — data should be Task
typed.approve({ id: 1, status: 'pending' });
const _approveReturn: Promise<Task | void> = typed.approve({ id: 1, status: 'pending' });

// @ts-expect-error — string is not Task
typed.approve('wrong');
// @ts-expect-error — missing required field 'status'
typed.approve({ id: 1 });

// String route — data stays any (no function to infer from)
typed.simple();
typed.simple('anything');
typed.simple({ whatever: true });

// Typed prepare (string route) — data inferred from prepare fallback
const prepareRegistry = createStoreRegistry<{ tasks: Task }>();
const prepareStore = prepareRegistry("tasks", {
  axios,
  route: "/tasks",
  actions: { getList: true },
  customActions: {
    submit: {
      route: '/tasks/submit',
      method: 'post',
      prepare: ({ id, status }: Task) => ({ task_id: id, status }),
    },
  },
});

const prepared = useCrud(prepareStore);

// Typed prepare — data should be Task
prepared.submit({ id: 1, status: 'draft' });
// @ts-expect-error — string is not Task
prepared.submit('wrong');
// @ts-expect-error — missing required field 'status'
prepared.submit({ id: 1 });

// Both route and prepare typed — route wins (first in chain)
type Payload = { task_id: number };
const bothRegistry = createStoreRegistry<{ tasks: Task }>();
const bothStore = bothRegistry("tasks", {
  axios,
  route: "/tasks",
  actions: { getList: true },
  customActions: {
    send: {
      route: ({ id }: Task) => `/tasks/${id}/send`,
      method: 'post',
      prepare: ({ task_id }: Payload) => ({ id: task_id }),
    },
  },
});

const both = useCrud(bothStore);
// Route wins — data is Task, not Payload
both.send({ id: 1, status: 'pending' });
// @ts-expect-error — Payload doesn't satisfy Task (route wins)
both.send({ task_id: 1 });

// UseCrudReturn preserves typed custom actions
type TypedReturn = UseCrudReturn<typeof typedStore>;
const _typedReturn: TypedReturn = typed;
const _approveFn: ((data?: Task, args?: any) => Promise<Task | void>) = typed.approve;

// Loading state still works on typed custom actions
const _resendIsLoading: boolean = typed.approve.isLoading;
const _resendError: any = typed.approve.error;
const _resendSequence: number = typed.approve.sequence;
